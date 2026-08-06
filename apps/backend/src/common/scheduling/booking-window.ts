/**
 * Размер окна доступности для бронирования, в днях от текущей даты.
 * См. models.tsp: BOOKING_WINDOW_DAYS.
 */
export const BOOKING_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Начало календарных суток (UTC) для переданной даты. */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Конец окна записи (эксклюзивно) — начало текущих суток (UTC) + 14 дней.
 * Считается по календарным суткам, а не по чистой арифметике `now + 14×24ч`,
 * чтобы граница совпадала с сеткой слотов, генерируемой по календарным дням
 * (см. slot-generator.ts) — иначе слот, отданный как доступный в GET /slots,
 * мог бы быть отклонён как OUT_OF_WINDOW при создании брони.
 */
export function getBookingWindowEnd(now: Date): Date {
  return new Date(startOfUtcDay(now).getTime() + BOOKING_WINDOW_DAYS * DAY_MS);
}

/** Список начал календарных суток (UTC) от сегодня на BOOKING_WINDOW_DAYS дней вперёд. */
export function getBookingWindowDays(now: Date): Date[] {
  const start = startOfUtcDay(now);
  return Array.from(
    { length: BOOKING_WINDOW_DAYS },
    (_, i) => new Date(start.getTime() + i * DAY_MS),
  );
}

/**
 * Попадает ли startTime в окно записи: [now, началоСегодня + 14 дней).
 * Прошлые моменты (в том числе сегодняшние слоты, которые уже наступили)
 * недопустимы.
 */
export function isWithinBookingWindow(startTime: Date, now: Date): boolean {
  return startTime >= now && startTime < getBookingWindowEnd(now);
}
