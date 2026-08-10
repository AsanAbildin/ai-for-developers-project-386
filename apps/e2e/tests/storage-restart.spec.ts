import { expect } from '@playwright/test';
import { test } from '../fixtures/isolated-backend';
import {
  createBooking,
  createEventType,
  firstAvailableSlot,
  listBookings,
  listEventTypes,
  listSlots,
} from '../fixtures/api';
import { buildEventTypeInput, uniqueGuestEmail, uniqueGuestName } from '../fixtures/testData';

/**
 * X-03: in-memory хранилище сбрасывается при перезапуске backend-процесса.
 * В отличие от остальных сценариев, этот поднимает собственный изолированный
 * backend (fixtures/isolated-backend.ts) и полностью перезапускает его, поэтому
 * не использует общий webServer из playwright.config.ts.
 */
test('X-03: после перезапуска backend (STORAGE_DRIVER=memory) данные сбрасываются', async ({
  isolatedBackend,
  request,
}) => {
  const baseUrl = isolatedBackend.baseUrl;

  // 1. Создаём данные в изолированном инстансе.
  const eventType = await createEventType(request, buildEventTypeInput(), `${baseUrl}/api`);
  const slots = await listSlots(request, eventType.id, `${baseUrl}/api`);
  const slot = firstAvailableSlot(slots);

  const created = await createBooking(
    request,
    {
      eventTypeId: eventType.id,
      startTime: slot.startTime,
      guestName: uniqueGuestName(),
      guestEmail: uniqueGuestEmail(),
    },
    `${baseUrl}/api`,
  );
  expect(created.status).toBe(201);

  // 2. Убеждаемся, что данные на месте до перезапуска.
  const eventTypesBefore = await listEventTypes(request, `${baseUrl}/api`);
  const bookingsBefore = await listBookings(request, `${baseUrl}/api`);
  expect(eventTypesBefore.some((e) => e.id === eventType.id)).toBe(true);
  expect(bookingsBefore.length).toBeGreaterThan(0);

  // 3. Перезапускаем backend-процесс.
  await isolatedBackend.restart();

  // 4. После перезапуска in-memory хранилище пусто.
  const eventTypesAfter = await listEventTypes(request, `${baseUrl}/api`);
  const bookingsAfter = await listBookings(request, `${baseUrl}/api`);
  expect(eventTypesAfter).toHaveLength(0);
  expect(bookingsAfter).toHaveLength(0);
});
