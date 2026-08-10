import { test, expect } from '@playwright/test';
import {
  createEventType,
  deleteEventType,
  createBooking,
  listSlots,
  firstAvailableSlot,
  listBookings,
  cancelByOwner,
} from '../fixtures/api';
import {
  buildEventTypeInput,
  uniqueEventTypeName,
  uniqueGuestEmail,
  uniqueGuestName,
} from '../fixtures/testData';
import { waitForHydration } from '../fixtures/ui';

/**
 * Сценарии владельца календаря (O-01..O-13), см. scenarios/user-scenarios.md.
 */

test.describe('Владелец — CRUD типов событий (UI)', () => {
  test('O-01: создание нового типа события через форму', async ({ page }) => {
    const name = uniqueEventTypeName();

    await page.goto('/admin/event-types');
    await waitForHydration(page);
    await page.getByTestId('add-event-type-button').click();
    await page.getByTestId('event-type-name-input').fill(name);
    await page.getByTestId('event-type-description-input').fill('Описание из e2e-теста');
    await page.getByTestId('event-type-duration-input').fill('45');
    await page.getByTestId('event-type-form-submit-button').click();

    const card = page.getByTestId('admin-event-type-card').filter({
      has: page.getByTestId('admin-event-type-name').getByText(name, { exact: true }),
    });
    await expect(card).toBeVisible();
  });

  test('O-02: пустое имя или неположительная длительность блокируют создание', async ({
    page,
  }) => {
    await page.goto('/admin/event-types');
    await waitForHydration(page);
    await page.getByTestId('add-event-type-button').click();

    // Пустое имя.
    await page.getByTestId('event-type-description-input').fill('desc');
    await page.getByTestId('event-type-duration-input').fill('30');
    await page.getByTestId('event-type-form-submit-button').click();
    // Форма не закрывается — модалка (и, значит, форма) остаётся открытой.
    await expect(page.getByTestId('event-type-form')).toBeVisible();

    // Неположительная длительность.
    await page.getByTestId('event-type-name-input').fill(uniqueEventTypeName());
    await page.getByTestId('event-type-duration-input').fill('0');
    await page.getByTestId('event-type-form-submit-button').click();
    await expect(page.getByTestId('event-type-form')).toBeVisible();
  });

  test('O-03: список всех типов событий отображается в админке', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());

    await page.goto('/admin/event-types');
    await waitForHydration(page);
    const card = page.getByTestId('admin-event-type-card').filter({
      has: page.getByTestId('admin-event-type-name').getByText(eventType.name, {
        exact: true,
      }),
    });
    await expect(card).toBeVisible();
  });

  test('O-04: частичное обновление типа события (PATCH) меняет только переданные поля', async ({
    page,
    request,
  }) => {
    const original = buildEventTypeInput();
    const eventType = await createEventType(request, original);
    const newDescription = 'Обновлённое описание из e2e';

    await page.goto('/admin/event-types');
    await waitForHydration(page);
    const card = page.getByTestId('admin-event-type-card').filter({
      has: page.getByTestId('admin-event-type-name').getByText(eventType.name, {
        exact: true,
      }),
    });
    await card.getByTestId('edit-event-type-button').click();
    await page.getByTestId('event-type-description-input').fill(newDescription);
    await page.getByTestId('event-type-form-submit-button').click();

    await expect(card).toBeVisible();
    // Имя и длительность не изменились, описание — да.
    await expect(card.getByTestId('admin-event-type-name')).toHaveText(eventType.name);
    await expect(card).toContainText(newDescription);
    await expect(card).toContainText(String(original.durationMinutes));
  });

  test('O-05: обновление несуществующего типа события возвращает 404', async ({
    request,
  }) => {
    const response = await request.patch(
      'http://localhost:3000/api/event-types/00000000-0000-0000-0000-000000000000',
      { data: { name: 'x' } },
    );
    expect(response.status()).toBe(404);
  });

  test('O-06: удаление типа события без активных броней', async ({ page, request }) => {
    const eventType = await createEventType(request, buildEventTypeInput());

    await page.goto('/admin/event-types');
    await waitForHydration(page);
    const card = page.getByTestId('admin-event-type-card').filter({
      has: page.getByTestId('admin-event-type-name').getByText(eventType.name, {
        exact: true,
      }),
    });
    await card.getByTestId('delete-event-type-button').click();
    await page.getByTestId('delete-event-type-confirm-button').waitFor({ state: 'visible' });
    await page.getByTestId('delete-event-type-confirm-button').click();

    await expect(card).not.toBeVisible();
  });

  test('O-07: удаление типа события с существующими бронями сохраняет их снэпшот', async ({
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

    await deleteEventType(request, eventType.id);

    const bookings = await listBookings(request);
    const ourBooking = bookings.find((b) => b.guestName === guestName);
    expect(ourBooking).toBeDefined();
    expect(ourBooking?.eventTypeName).toBe(eventTypeInput.name);
    expect(ourBooking?.durationMinutes).toBe(eventTypeInput.durationMinutes);
  });

  test('O-08: удаление несуществующего типа события возвращает 404', async ({
    request,
  }) => {
    const response = await request.delete(
      'http://localhost:3000/api/event-types/00000000-0000-0000-0000-000000000000',
    );
    expect(response.status()).toBe(404);
  });
});

test.describe('Владелец — список бронирований', () => {
  test('O-09: все брони по всем типам событий отсортированы по startTime', async ({
    request,
  }) => {
    const eventTypeA = await createEventType(request, buildEventTypeInput());
    const eventTypeB = await createEventType(request, buildEventTypeInput());
    const slotsA = await listSlots(request, eventTypeA.id);
    const available = slotsA.filter((s) => s.isAvailable);
    const early = available[0];
    const late = available[available.length - 1];

    const guestEarly = uniqueGuestName('E2E Ранний гость');
    const guestLate = uniqueGuestName('E2E Поздний гость');

    // Создаём в "неправильном" порядке (поздний раньше раннего), чтобы
    // убедиться, что сортировка идёт по startTime, а не по времени создания.
    await createBooking(request, {
      eventTypeId: eventTypeB.id,
      startTime: late.startTime,
      guestName: guestLate,
      guestEmail: uniqueGuestEmail(),
    });
    await createBooking(request, {
      eventTypeId: eventTypeA.id,
      startTime: early.startTime,
      guestName: guestEarly,
      guestEmail: uniqueGuestEmail(),
    });

    const bookings = await listBookings(request);
    const indexEarly = bookings.findIndex((b) => b.guestName === guestEarly);
    const indexLate = bookings.findIndex((b) => b.guestName === guestLate);
    expect(indexEarly).toBeGreaterThanOrEqual(0);
    expect(indexLate).toBeGreaterThanOrEqual(0);
    expect(indexEarly).toBeLessThan(indexLate);

    // Также проверяем, что общий список действительно отсортирован по всей длине.
    const startTimes = bookings.map((b) => new Date(b.startTime).getTime());
    const sorted = [...startTimes].sort((a, b) => a - b);
    expect(startTimes).toEqual(sorted);
  });

  test('O-09b: свежесозданная бронь отображается в таблице владельца (UI)', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const slots = await listSlots(request, eventType.id);
    const slot = firstAvailableSlot(slots);
    const guestName = uniqueGuestName();

    await createBooking(request, {
      eventTypeId: eventType.id,
      startTime: slot.startTime,
      guestName,
      guestEmail: uniqueGuestEmail(),
    });

    await page.goto('/admin');
    await waitForHydration(page);
    await expect(page.getByTestId('admin-bookings-table')).toBeVisible();
    // Бронь может оказаться на любой странице пагинации — ищем по всем страницам.
    expect(await findBookingRowAcrossPages(page, guestName)).toBe(true);
  });

  test('O-10: пагинация списка бронирований показывает все записи без потерь/дублей', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const slots = (await listSlots(request, eventType.id)).filter((s) => s.isAvailable);
    const guestNames: string[] = [];

    for (let i = 0; i < 15 && i < slots.length; i++) {
      const guestName = uniqueGuestName(`E2E Пагинация ${i}`);
      guestNames.push(guestName);
      await createBooking(request, {
        eventTypeId: eventType.id,
        startTime: slots[i]!.startTime,
        guestName,
        guestEmail: uniqueGuestEmail(),
      });
    }

    await page.goto('/admin');
    await waitForHydration(page);
    await expect(page.getByTestId('admin-bookings-pagination')).toBeVisible();

    for (const guestName of guestNames) {
      expect(await findBookingRowAcrossPages(page, guestName)).toBe(true);
    }
  });

  test('O-11: владелец отменяет любую бронь без токена, с указанием причины', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const slots = await listSlots(request, eventType.id);
    const slot = firstAvailableSlot(slots);
    const guestName = uniqueGuestName();

    await createBooking(request, {
      eventTypeId: eventType.id,
      startTime: slot.startTime,
      guestName,
      guestEmail: uniqueGuestEmail(),
    });

    await page.goto('/admin');
    await waitForHydration(page);
    const row = await locateBookingRowAcrossPages(page, guestName);
    expect(row).not.toBeNull();
    await row!.getByTestId('cancel-booking-button').click();
    await page.getByTestId('owner-cancel-confirm-button').waitFor({ state: 'visible' });
    await page.getByTestId('owner-cancel-reason-input').fill('Изменилось расписание владельца');
    await page.getByTestId('owner-cancel-confirm-button').click();

    await expect(row!.getByTestId('booking-row-status')).toHaveText('Отменено');
  });

  test('O-12: повторная отмена уже отменённой брони владельцем отклоняется (409)', async ({
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
    const bookingId = (created.body as { id: string }).id;

    const first = await cancelByOwner(request, bookingId);
    expect(first.status).toBe(200);

    const second = await cancelByOwner(request, bookingId);
    expect(second.status).toBe(409);
    expect((second.body as { code: string }).code).toBe('ALREADY_CANCELLED');
  });

  test('O-13: отмена несуществующей брони владельцем возвращает 404', async ({
    request,
  }) => {
    const { status } = await cancelByOwner(
      request,
      '00000000-0000-0000-0000-000000000000',
    );
    expect(status).toBe(404);
  });
});

/**
 * Ищет строку бронирования с данным guestName, при необходимости
 * переключая страницы пагинации таблицы владельца. Возвращает locator
 * найденной строки на текущей открытой странице, либо null.
 */
async function locateBookingRowAcrossPages(
  page: import('@playwright/test').Page,
  guestName: string,
) {
  const row = page.getByTestId('booking-row').filter({
    has: page.getByTestId('booking-row-guest-name').getByText(guestName, {
      exact: true,
    }),
  });
  const maxPages = 50;
  for (let i = 0; i < maxPages; i++) {
    // Даём странице время отрисоваться: если строка есть на текущей странице —
    // находим её, иначе переходим к следующей. Без ожидания быстрые клики
    // «Next» обгоняют перерисовку Vue и пропускают страницы.
    try {
      await row.first().waitFor({ state: 'attached', timeout: 1500 });
      return row.first();
    } catch {
      const nextButton = page.getByTestId('bookings-next-page-button');
      if (!(await nextButton.isVisible().catch(() => false))) return null;
      if (await nextButton.isDisabled().catch(() => true)) return null;
      await nextButton.click();
    }
  }
  return null;
}

async function findBookingRowAcrossPages(
  page: import('@playwright/test').Page,
  guestName: string,
): Promise<boolean> {
  const row = await locateBookingRowAcrossPages(page, guestName);
  return row !== null;
}
