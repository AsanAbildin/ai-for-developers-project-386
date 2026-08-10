import { test, expect } from '@playwright/test';
import {
  createEventType,
  createBooking,
  listSlots,
  firstAvailableSlot,
  listBookings,
  deleteEventType,
} from '../fixtures/api';
import { buildEventTypeInput, uniqueGuestEmail, uniqueGuestName } from '../fixtures/testData';
import { bookFirstAvailableSlot } from '../fixtures/ui';

/**
 * Сквозные и граничные сценарии X-01, X-05, X-06, X-07, см.
 * scenarios/user-scenarios.md. X-02 — apps/e2e/tests/booking-window-boundary.spec.ts,
 * X-03 — apps/e2e/tests/storage-restart.spec.ts, X-04 — apps/e2e/tests/network-errors.spec.ts.
 */

test('X-01: пересекающиеся по времени типы событий блокируют друг друга', async ({
  request,
}) => {
  const eventTypeA = await createEventType(
    request,
    buildEventTypeInput({ durationMinutes: 30 }),
  );
  const eventTypeB = await createEventType(
    request,
    buildEventTypeInput({ durationMinutes: 60 }),
  );

  const slots = await listSlots(request, eventTypeA.id);
  const slot = firstAvailableSlot(slots);

  const first = await createBooking(request, {
    eventTypeId: eventTypeA.id,
    startTime: slot.startTime,
    guestName: uniqueGuestName(),
    guestEmail: uniqueGuestEmail(),
  });
  expect(first.status).toBe(201);

  const second = await createBooking(request, {
    eventTypeId: eventTypeB.id,
    startTime: slot.startTime,
    guestName: uniqueGuestName(),
    guestEmail: uniqueGuestEmail(),
  });
  expect(second.status).toBe(409);
  expect((second.body as { code: string }).code).toBe('SLOT_UNAVAILABLE');
});

test('X-05: отменённая бронь снова освобождает слот', async ({ page, request }) => {
  const eventType = await createEventType(request, buildEventTypeInput());
  const guestName = uniqueGuestName();
  const guestEmail = uniqueGuestEmail();

  const { slotStartTime } = await bookFirstAvailableSlot(
    page,
    eventType.id,
    guestName,
    guestEmail,
  );

  const slotsAfterBooking = await listSlots(request, eventType.id);
  const bookedSlot = slotsAfterBooking.find((s) => s.startTime === slotStartTime);
  expect(bookedSlot?.isAvailable).toBe(false);

  await page.getByTestId('open-cancel-booking-button').click();
  await page.getByTestId('guest-cancel-confirm-button').waitFor({ state: 'visible' });
  await page.getByTestId('guest-cancel-confirm-button').click();
  await expect(page.getByTestId('booking-confirmation')).not.toBeVisible();

  const slotsAfterCancel = await listSlots(request, eventType.id);
  const freedSlot = slotsAfterCancel.find((s) => s.startTime === slotStartTime);
  expect(freedSlot?.isAvailable).toBe(true);
});

test('X-06: конкурентное бронирование одного слота не создаёт дублей', async ({
  request,
}) => {
  const eventType = await createEventType(request, buildEventTypeInput());
  const slots = await listSlots(request, eventType.id);
  const slot = firstAvailableSlot(slots);

  const attempts = await Promise.all(
    Array.from({ length: 5 }, () =>
      createBooking(request, {
        eventTypeId: eventType.id,
        startTime: slot.startTime,
        guestName: uniqueGuestName(),
        guestEmail: uniqueGuestEmail(),
      }),
    ),
  );

  const successes = attempts.filter((a) => a.status === 201);
  const conflicts = attempts.filter((a) => a.status === 409);
  expect(successes).toHaveLength(1);
  expect(conflicts).toHaveLength(4);
  for (const conflict of conflicts) {
    expect((conflict.body as { code: string }).code).toBe('SLOT_UNAVAILABLE');
  }

  // Убеждаемся, что в хранилище действительно только одна активная бронь на
  // этот слот этого типа события — гонка не создала скрытых дублей.
  const bookings = await listBookings(request);
  const matching = bookings.filter(
    (b) =>
      b.eventTypeId === eventType.id &&
      b.startTime === slot.startTime &&
      b.status === 'accepted',
  );
  expect(matching).toHaveLength(1);
});

test('X-07: удаление типа события "на лету" не даёт создать по нему новую бронь', async ({
  request,
}) => {
  const eventType = await createEventType(request, buildEventTypeInput());
  const slots = await listSlots(request, eventType.id);
  const slot = firstAvailableSlot(slots);

  await deleteEventType(request, eventType.id);

  const { status, body } = await createBooking(request, {
    eventTypeId: eventType.id,
    startTime: slot.startTime,
    guestName: uniqueGuestName(),
    guestEmail: uniqueGuestEmail(),
  });

  expect(status).toBe(400);
  expect((body as { code: string }).code).toBe('EVENT_TYPE_NOT_FOUND');
});
