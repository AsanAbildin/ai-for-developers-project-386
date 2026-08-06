import { describe, expect, it } from 'vitest'
import {
  BOOKING_WINDOW_DAYS,
  getAvailableSlots,
  getBookingWindowDays,
  groupSlotsByDay,
  isWithinBookingWindow
} from '~/utils/dateWindow'
import type { Slot } from '~/composables/useEventSlots'

describe('getBookingWindowDays', () => {
  it('возвращает ровно BOOKING_WINDOW_DAYS дней, начиная с указанной даты', () => {
    const from = new Date('2026-01-01T15:30:00Z')
    const days = getBookingWindowDays(from)

    expect(days).toHaveLength(BOOKING_WINDOW_DAYS)
    expect(days[0]?.getHours()).toBe(0)
    expect(days[0]?.getMinutes()).toBe(0)
  })
})

describe('isWithinBookingWindow', () => {
  const from = new Date('2026-01-01T00:00:00')

  it('true для сегодняшней даты', () => {
    expect(isWithinBookingWindow(new Date('2026-01-01T12:00:00'), from)).toBe(true)
  })

  it('true для последнего дня окна (14 дней вперёд)', () => {
    expect(isWithinBookingWindow(new Date('2026-01-14T23:59:00'), from)).toBe(true)
  })

  it('false для даты сразу за пределами окна', () => {
    expect(isWithinBookingWindow(new Date('2026-01-15T00:00:00'), from)).toBe(false)
  })

  it('false для даты в прошлом', () => {
    expect(isWithinBookingWindow(new Date('2025-12-31T23:59:00'), from)).toBe(false)
  })
})

describe('groupSlotsByDay', () => {
  it('группирует слоты по локальной календарной дате', () => {
    const slots: Slot[] = [
      { startTime: '2026-01-01T09:00:00Z', endTime: '2026-01-01T09:30:00Z', isAvailable: true },
      { startTime: '2026-01-01T10:00:00Z', endTime: '2026-01-01T10:30:00Z', isAvailable: false },
      { startTime: '2026-01-02T09:00:00Z', endTime: '2026-01-02T09:30:00Z', isAvailable: true }
    ]

    const grouped = groupSlotsByDay(slots)

    expect(grouped.size).toBe(2)
    expect(grouped.get('2026-01-01')).toHaveLength(2)
    expect(grouped.get('2026-01-02')).toHaveLength(1)
  })
})

describe('getAvailableSlots', () => {
  it('отфильтровывает занятые слоты и сортирует по времени начала', () => {
    const slots: Slot[] = [
      { startTime: '2026-01-01T10:00:00Z', endTime: '2026-01-01T10:30:00Z', isAvailable: true },
      { startTime: '2026-01-01T09:00:00Z', endTime: '2026-01-01T09:30:00Z', isAvailable: true },
      { startTime: '2026-01-01T09:30:00Z', endTime: '2026-01-01T10:00:00Z', isAvailable: false }
    ]

    const available = getAvailableSlots(slots)

    expect(available).toHaveLength(2)
    expect(available[0]?.startTime).toBe('2026-01-01T09:00:00Z')
    expect(available[1]?.startTime).toBe('2026-01-01T10:00:00Z')
  })
})
