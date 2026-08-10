import type { APIRequestContext } from '@playwright/test';
import type { EventTypeInput } from './testData';

/**
 * Прямые вызовы backend API в обход UI — используются для быстрого сидинга
 * тестовых данных (создать тип события, забронировать слот "фоном" для
 * сценариев конфликта и т.п.), а не для проверки самого API (это уже
 * покрыто unit-тестами backend, см. apps/backend/src/**\/*.spec.ts).
 */

export const BACKEND_BASE_URL = 'http://localhost:3000/api';

export interface EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

export interface Slot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface Booking {
  id: string;
  eventTypeId: string | null;
  eventTypeName: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  guestName: string;
  guestEmail: string;
  status: 'accepted' | 'cancelled';
  cancellationReason?: string;
  createdAt: string;
}

export interface BookingCreateResult extends Booking {
  cancellationToken: string;
}

export async function createEventType(
  request: APIRequestContext,
  input: EventTypeInput,
  baseUrl = BACKEND_BASE_URL,
): Promise<EventType> {
  const response = await request.post(`${baseUrl}/event-types`, {
    data: input,
  });
  if (!response.ok()) {
    throw new Error(
      `Не удалось создать тип события: ${response.status()} ${await response.text()}`,
    );
  }
  return response.json();
}

export async function listEventTypes(
  request: APIRequestContext,
  baseUrl = BACKEND_BASE_URL,
): Promise<EventType[]> {
  const response = await request.get(`${baseUrl}/event-types`);
  if (!response.ok()) {
    throw new Error(
      `Не удалось получить список типов событий: ${response.status()} ${await response.text()}`,
    );
  }
  return response.json();
}

export async function deleteEventType(
  request: APIRequestContext,
  id: string,
  baseUrl = BACKEND_BASE_URL,
): Promise<void> {
  const response = await request.delete(`${baseUrl}/event-types/${id}`);
  if (!response.ok()) {
    throw new Error(
      `Не удалось удалить тип события: ${response.status()} ${await response.text()}`,
    );
  }
}

export async function listSlots(
  request: APIRequestContext,
  eventTypeId: string,
  baseUrl = BACKEND_BASE_URL,
): Promise<Slot[]> {
  const response = await request.get(
    `${baseUrl}/event-types/${eventTypeId}/slots`,
  );
  if (!response.ok()) {
    throw new Error(
      `Не удалось получить слоты: ${response.status()} ${await response.text()}`,
    );
  }
  return response.json();
}

/** Первый свободный слот из ответа API (сортировка по возрастанию времени). */
export function firstAvailableSlot(slots: Slot[]): Slot {
  const slot = slots
    .filter((s) => s.isAvailable)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  if (!slot) {
    throw new Error('Нет доступных слотов для бронирования');
  }
  return slot;
}

export interface CreateBookingInput {
  eventTypeId: string;
  startTime: string;
  guestName: string;
  guestEmail: string;
}

export async function createBooking(
  request: APIRequestContext,
  input: CreateBookingInput,
  baseUrl = BACKEND_BASE_URL,
): Promise<{ status: number; body: BookingCreateResult | { code: string; message: string } }> {
  const response = await request.post(`${baseUrl}/bookings`, { data: input });
  return { status: response.status(), body: await response.json() };
}

export async function listBookings(
  request: APIRequestContext,
  baseUrl = BACKEND_BASE_URL,
): Promise<Booking[]> {
  const response = await request.get(`${baseUrl}/bookings`);
  if (!response.ok()) {
    throw new Error(
      `Не удалось получить список бронирований: ${response.status()} ${await response.text()}`,
    );
  }
  return response.json();
}

export async function cancelByOwner(
  request: APIRequestContext,
  id: string,
  cancellationReason?: string,
  baseUrl = BACKEND_BASE_URL,
): Promise<{ status: number; body: Booking | { code: string; message: string } }> {
  const response = await request.post(`${baseUrl}/bookings/${id}/cancel`, {
    data: { cancellationReason },
  });
  return { status: response.status(), body: await response.json() };
}

export async function cancelByGuest(
  request: APIRequestContext,
  id: string,
  cancellationToken: string,
  cancellationReason?: string,
  baseUrl = BACKEND_BASE_URL,
): Promise<{ status: number; body: Booking | { code: string; message: string } }> {
  const response = await request.post(
    `${baseUrl}/bookings/${id}/guest-cancel?cancellationToken=${encodeURIComponent(cancellationToken)}`,
    { data: { cancellationReason } },
  );
  return { status: response.status(), body: await response.json() };
}
