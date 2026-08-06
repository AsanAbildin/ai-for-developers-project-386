import {
  BOOKING_WINDOW_DAYS,
  getBookingWindowDays,
  getBookingWindowEnd,
  isWithinBookingWindow,
  startOfUtcDay,
} from './booking-window';

describe('startOfUtcDay', () => {
  it('обрезает время до начала суток UTC', () => {
    const result = startOfUtcDay(new Date('2026-01-01T15:30:00Z'));
    expect(result.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('getBookingWindowDays', () => {
  it('возвращает ровно BOOKING_WINDOW_DAYS дней, начиная с полуночи сегодня', () => {
    const days = getBookingWindowDays(new Date('2026-01-01T15:30:00Z'));
    expect(days).toHaveLength(BOOKING_WINDOW_DAYS);
    expect(days[0]?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(days[13]?.toISOString()).toBe('2026-01-14T00:00:00.000Z');
  });
});

describe('getBookingWindowEnd', () => {
  it('равна началу суток сегодня + 14 дней', () => {
    const end = getBookingWindowEnd(new Date('2026-01-01T15:30:00Z'));
    expect(end.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });
});

describe('isWithinBookingWindow', () => {
  const now = new Date('2026-01-01T12:00:00Z');

  it('true для текущего момента', () => {
    expect(isWithinBookingWindow(now, now)).toBe(true);
  });

  it('false для момента в прошлом', () => {
    expect(isWithinBookingWindow(new Date('2026-01-01T11:59:59Z'), now)).toBe(
      false,
    );
  });

  it('true для последнего момента окна (23:59 14-го дня)', () => {
    expect(isWithinBookingWindow(new Date('2026-01-14T23:59:00Z'), now)).toBe(
      true,
    );
  });

  it('false ровно на границе окна (полночь 15-го дня)', () => {
    expect(isWithinBookingWindow(new Date('2026-01-15T00:00:00Z'), now)).toBe(
      false,
    );
  });

  it('false для момента далеко за пределами окна', () => {
    expect(isWithinBookingWindow(new Date('2026-02-01T00:00:00Z'), now)).toBe(
      false,
    );
  });
});
