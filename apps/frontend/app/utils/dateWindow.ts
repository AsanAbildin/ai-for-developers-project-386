import dayjs from 'dayjs'
import type { Slot } from '~/composables/useEventSlots'

/** Размер окна доступности для бронирования, в днях от текущей даты (см. models.tsp). */
export const BOOKING_WINDOW_DAYS = 14

/**
 * Список дат (начало дня, локальное время) от сегодня до конца окна записи,
 * включительно. Используется для построения календаря выбора дня.
 */
export function getBookingWindowDays(from: Date = new Date()): Date[] {
  const start = dayjs(from).startOf('day')
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => start.add(i, 'day').toDate())
}

/** Является ли дата допустимой для записи — сегодня или в пределах окна 14 дней. */
export function isWithinBookingWindow(date: Date, from: Date = new Date()): boolean {
  const start = dayjs(from).startOf('day')
  const end = start.add(BOOKING_WINDOW_DAYS, 'day')
  const target = dayjs(date)
  return !target.isBefore(start) && target.isBefore(end)
}

/**
 * Группирует слоты по календарному дню (локальная дата, формат YYYY-MM-DD).
 * Возвращает Map, сохраняющую порядок появления дней во входном массиве.
 */
export function groupSlotsByDay(slots: Slot[]): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>()
  for (const slot of slots) {
    const key = dayjs(slot.startTime).format('YYYY-MM-DD')
    const existing = map.get(key)
    if (existing) {
      existing.push(slot)
    } else {
      map.set(key, [slot])
    }
  }
  return map
}

/** Только доступные слоты, отсортированные по времени начала. */
export function getAvailableSlots(slots: Slot[]): Slot[] {
  return slots
    .filter(slot => slot.isAvailable)
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
}
