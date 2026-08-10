import { test, expect } from '@playwright/test';
import {
  createEventType,
  createBooking,
  listSlots,
  firstAvailableSlot,
  cancelByGuest,
  listBookings,
  listEventTypes,
  deleteEventType,
} from '../fixtures/api';
import {
  buildEventTypeInput,
  uniqueGuestEmail,
  uniqueGuestName,
} from '../fixtures/testData';
import {
  gotoBookingPage,
  selectFirstAvailableSlot,
  fillGuestForm,
  submitBookingForm,
  getCancellationToken,
  bookFirstAvailableSlot,
  waitForHydration,
} from '../fixtures/ui';

/**
 * Сценарии гостя (G-01..G-16), см. scenarios/user-scenarios.md.
 * Каждый test.describe соответствует одной строке таблицы "Сценарии гостя".
 */

test.describe('Гость — просмотр типов событий', () => {
  test('G-01: список типов событий отображается на главной странице', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());

    await page.goto('/');
    await waitForHydration(page);
    await expect(page.getByTestId('event-types-list')).toBeVisible();
    const card = page.getByTestId('event-type-card').filter({
      has: page.getByTestId('event-type-name').getByText(eventType.name, { exact: true }),
    });
    await expect(card).toBeVisible();
    await expect(card.getByTestId('event-type-description')).toHaveText(
      eventType.description,
    );
    await expect(card.getByTestId('event-type-duration')).toContainText(
      String(eventType.durationMinutes),
    );
  });

  test('G-02: пустой список типов событий не ломает UI', async ({ page, request }) => {
    // Главная страница SSR-ится: данные фетчит серверный процесс Nuxt, который
    // page.route не перехватывает. Поэтому очищаем реальное хранилище через API.
    // Тесты идут последовательно (workers: 1), так что конкурентных созданий
    // типов событий в этот момент нет.
    const eventTypes = await listEventTypes(request);
    for (const eventType of eventTypes) {
      await deleteEventType(request, eventType.id);
    }

    await page.goto('/');
    await waitForHydration(page);
    await expect(page.getByTestId('event-types-empty')).toBeVisible();
    await expect(page.getByTestId('event-types-list')).toHaveCount(0);
  });

  test('G-03: несуществующий тип события показывает ошибку, а не падение UI', async ({
    page,
  }) => {
    await page.goto('/book/00000000-0000-0000-0000-000000000000');
    await waitForHydration(page);
    await expect(page.getByTestId('event-type-error')).toBeVisible();
  });
});

test.describe('Гость — слоты и занятость', () => {
  test('G-04: календарь показывает свободные и занятые слоты на 14 дней', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    await gotoBookingPage(page, eventType.id);

    await expect(page.getByTestId('day-list')).toBeVisible();
    const dayButtons = page.getByTestId('day-button');
    await expect(dayButtons).toHaveCount(14);
  });

  test('G-05: слот занят одним типом события блокирует его и для другого типа', async ({
    page,
    request,
  }) => {
    const eventTypeA = await createEventType(
      request,
      buildEventTypeInput({ durationMinutes: 30 }),
    );
    const eventTypeB = await createEventType(
      request,
      buildEventTypeInput({ durationMinutes: 30 }),
    );

    const slotsBefore = await listSlots(request, eventTypeA.id);
    const slot = firstAvailableSlot(slotsBefore);

    const { status } = await createBooking(request, {
      eventTypeId: eventTypeA.id,
      startTime: slot.startTime,
      guestName: uniqueGuestName(),
      guestEmail: uniqueGuestEmail(),
    });
    expect(status).toBe(201);

    const slotsForB = await listSlots(request, eventTypeB.id);
    const sameSlotForB = slotsForB.find((s) => s.startTime === slot.startTime);
    expect(sameSlotForB?.isAvailable).toBe(false);
  });
});

test.describe('Гость — создание бронирования', () => {
  test('G-06: успешное бронирование свободного слота выдаёт cancellationToken', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const guestName = uniqueGuestName();
    const guestEmail = uniqueGuestEmail();

    await gotoBookingPage(page, eventType.id);
    await selectFirstAvailableSlot(page);
    await fillGuestForm(page, guestName, guestEmail);
    await submitBookingForm(page);

    await expect(page.getByTestId('booking-confirmation')).toBeVisible();
    const token = await getCancellationToken(page);
    expect(token).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test('G-07: два гостя бронируют один слот одновременно — только один успешен', async ({
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const slots = await listSlots(request, eventType.id);
    const slot = firstAvailableSlot(slots);

    const [first, second] = await Promise.all([
      createBooking(request, {
        eventTypeId: eventType.id,
        startTime: slot.startTime,
        guestName: uniqueGuestName(),
        guestEmail: uniqueGuestEmail(),
      }),
      createBooking(request, {
        eventTypeId: eventType.id,
        startTime: slot.startTime,
        guestName: uniqueGuestName(),
        guestEmail: uniqueGuestEmail(),
      }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    const conflict = first.status === 409 ? first : second;
    expect((conflict.body as { code: string }).code).toBe('SLOT_UNAVAILABLE');
  });

  test('G-08: бронирование вне окна 14 дней отклоняется (400 OUT_OF_WINDOW)', async ({
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { status, body } = await createBooking(request, {
      eventTypeId: eventType.id,
      startTime: farFuture,
      guestName: uniqueGuestName(),
      guestEmail: uniqueGuestEmail(),
    });

    expect(status).toBe(400);
    expect((body as { code: string }).code).toBe('OUT_OF_WINDOW');
  });

  test('G-09: бронирование с несуществующим eventTypeId отклоняется (400 EVENT_TYPE_NOT_FOUND)', async ({
    request,
  }) => {
    const { status, body } = await createBooking(request, {
      eventTypeId: '00000000-0000-0000-0000-000000000000',
      startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      guestName: uniqueGuestName(),
      guestEmail: uniqueGuestEmail(),
    });

    expect(status).toBe(400);
    expect((body as { code: string }).code).toBe('EVENT_TYPE_NOT_FOUND');
  });

  test('G-10: форма бронирования валидирует пустое имя и некорректный email', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    await gotoBookingPage(page, eventType.id);
    await selectFirstAvailableSlot(page);

    await page.getByTestId('guest-email-input').fill('not-an-email');
    await submitBookingForm(page);

    // Форма не должна отправиться — подтверждение бронирования не появляется.
    await expect(page.getByTestId('booking-confirmation')).not.toBeVisible();
    await expect(page.getByTestId('booking-form')).toBeVisible();
  });
});

test.describe('Гость — отмена бронирования', () => {
  test('G-11: гость отменяет свою бронь по валидному cancellationToken', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const guestName = uniqueGuestName();
    const guestEmail = uniqueGuestEmail();

    const { slotStartTime } = await bookFirstAvailableSlot(
      page,
      eventType.id,
      guestName,
      guestEmail,
    );

    await page.getByTestId('open-cancel-booking-button').click();
    await page.getByTestId('guest-cancel-confirm-button').waitFor({ state: 'visible' });
    await page.getByTestId('guest-cancel-confirm-button').click();

    await expect(page.getByTestId('booking-confirmation')).not.toBeVisible();

    // Слот снова свободен.
    const slots = await listSlots(request, eventType.id);
    const slot = slots.find((s) => s.startTime === slotStartTime);
    expect(slot?.isAvailable).toBe(true);
  });

  test('G-12: отмена с неверным cancellationToken отклоняется (403)', async ({
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const slots = await listSlots(request, eventType.id);
    const slot = firstAvailableSlot(slots);

    const created = await createBooking(request, {
      eventTypeId: eventType.id,
      startTime: slot.startTime,
      guestName: uniqueGuestName(),
      guestEmail: uniqueGuestEmail(),
    });
    expect(created.status).toBe(201);
    const bookingId = (created.body as { id: string }).id;

    const { status, body } = await cancelByGuest(
      request,
      bookingId,
      'invalid-token-00000000',
    );

    expect(status).toBe(403);
    expect((body as { code: string }).code).toBe('INVALID_CANCELLATION_TOKEN');
  });

  test('G-13: повторная отмена уже отменённой брони отклоняется (409 ALREADY_CANCELLED)', async ({
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const slots = await listSlots(request, eventType.id);
    const slot = firstAvailableSlot(slots);

    const created = await createBooking(request, {
      eventTypeId: eventType.id,
      startTime: slot.startTime,
      guestName: uniqueGuestName(),
      guestEmail: uniqueGuestEmail(),
    });
    const booking = created.body as { id: string; cancellationToken: string };

    const first = await cancelByGuest(request, booking.id, booking.cancellationToken);
    expect(first.status).toBe(200);

    const second = await cancelByGuest(request, booking.id, booking.cancellationToken);
    expect(second.status).toBe(409);
    expect((second.body as { code: string }).code).toBe('ALREADY_CANCELLED');
  });

  test('G-14: отмена несуществующей брони возвращает 404', async ({ request }) => {
    const { status } = await cancelByGuest(
      request,
      '00000000-0000-0000-0000-000000000000',
      'some-token',
    );
    expect(status).toBe(404);
  });

  test('G-15: guest-cancel без cancellationToken отклоняется (400 MISSING_CANCELLATION_TOKEN)', async ({
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const slots = await listSlots(request, eventType.id);
    const slot = firstAvailableSlot(slots);

    const created = await createBooking(request, {
      eventTypeId: eventType.id,
      startTime: slot.startTime,
      guestName: uniqueGuestName(),
      guestEmail: uniqueGuestEmail(),
    });
    const booking = created.body as { id: string };

    const response = await request.post(
      `http://localhost:3000/api/bookings/${booking.id}/guest-cancel`,
      { data: {} },
    );
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('MISSING_CANCELLATION_TOKEN');
  });
});

test.describe('Гость — поведение при удалённом типе события', () => {
  test('G-16: бронь по удалённому типу события сохраняет снэпшот имени/длительности', async ({
    request,
  }) => {
    const eventTypeInput = buildEventTypeInput();
    const eventType = await createEventType(request, eventTypeInput);
    const slots = await listSlots(request, eventType.id);
    const slot = firstAvailableSlot(slots);
    const guestName = uniqueGuestName();

    const created = await createBooking(request, {
      eventTypeId: eventType.id,
      startTime: slot.startTime,
      guestName,
      guestEmail: uniqueGuestEmail(),
    });
    expect(created.status).toBe(201);

    await request.delete(`http://localhost:3000/api/event-types/${eventType.id}`);

    // Старая бронь по-прежнему возвращается в общем списке владельца, со
    // снэпшотом name/duration (список может содержать много других записей
    // из параллельных тестов — ищем по уникальному guestName этого теста,
    // а не полагаемся на пагинацию UI).
    const bookings = await listBookings(request);
    const ourBooking = bookings.find((b) => b.guestName === guestName);
    expect(ourBooking).toBeDefined();
    expect(ourBooking?.eventTypeName).toBe(eventTypeInput.name);
    expect(ourBooking?.durationMinutes).toBe(eventTypeInput.durationMinutes);

    // Новую бронь по удалённому типу создать нельзя.
    const { status, body } = await createBooking(request, {
      eventTypeId: eventType.id,
      startTime: slots[1]?.startTime ?? slot.startTime,
      guestName: uniqueGuestName(),
      guestEmail: uniqueGuestEmail(),
    });
    expect(status).toBe(400);
    expect((body as { code: string }).code).toBe('EVENT_TYPE_NOT_FOUND');
  });
});
