import { test, expect } from '@playwright/test';
import { createEventType, createBooking, listSlots } from '../fixtures/api';
import { buildEventTypeInput, uniqueGuestEmail, uniqueGuestName } from '../fixtures/testData';

/**
 * X-02: границы 14-дневного окна записи. Окно считается по календарным
 * суткам UTC: [текущий момент, началоСегодня(UTC) + 14 дней) — см.
 * apps/backend/src/common/scheduling/booking-window.ts.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

test.describe('X-02: границы окна бронирования', () => {
  test('API отдаёт слоты ровно на 14 календарных дней вперёд', async ({ request }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const slots = await listSlots(request, eventType.id);

    const days = new Set(slots.map((s) => s.startTime.slice(0, 10)));
    expect(days.size).toBe(14);
  });

  test('бронирование ровно на границе окна (now + 14 дней) отклоняется', async ({
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const windowEnd = new Date(startOfUtcDay(new Date()).getTime() + 14 * DAY_MS);

    const { status, body } = await createBooking(request, {
      eventTypeId: eventType.id,
      startTime: windowEnd.toISOString(),
      guestName: uniqueGuestName(),
      guestEmail: uniqueGuestEmail(),
    });

    expect(status).toBe(400);
    expect((body as { code: string }).code).toBe('OUT_OF_WINDOW');
  });

  test('последний слот последнего дня окна доступен для бронирования', async ({
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const slots = await listSlots(request, eventType.id);

    const lastDayKey = [...new Set(slots.map((s) => s.startTime.slice(0, 10)))].sort().at(
      -1,
    )!;
    const lastDaySlots = slots
      .filter((s) => s.startTime.startsWith(lastDayKey) && s.isAvailable)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    expect(lastDaySlots.length).toBeGreaterThan(0);
    const lastSlot = lastDaySlots.at(-1)!;

    const { status } = await createBooking(request, {
      eventTypeId: eventType.id,
      startTime: lastSlot.startTime,
      guestName: uniqueGuestName(),
      guestEmail: uniqueGuestEmail(),
    });
    expect(status).toBe(201);
  });

  test('слоты, начало которых уже в прошлом относительно текущего момента, помечены недоступными', async ({
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());
    const slots = await listSlots(request, eventType.id);
    const now = new Date();

    const pastSlots = slots.filter((s) => new Date(s.startTime) < now);
    for (const slot of pastSlots) {
      expect(slot.isAvailable).toBe(false);
    }
  });
});
