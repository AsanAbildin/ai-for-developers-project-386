export interface GeneratedSlot {
  startTime: Date;
  endTime: Date;
}

const MINUTE_MS = 60 * 1000;

/**
 * Сетка слотов на одни календарные сутки (UTC), с шагом, равным
 * durationMinutes типа события. Слоты идут подряд без промежутков,
 * начиная с 00:00. Хвостовой слот, который не помещается целиком до
 * полуночи следующих суток, отбрасывается.
 */
export function generateDaySlots(
  day: Date,
  durationMinutes: number,
): GeneratedSlot[] {
  const dayStart = day.getTime();
  const dayEnd = dayStart + 24 * 60 * MINUTE_MS;
  const stepMs = durationMinutes * MINUTE_MS;

  const slots: GeneratedSlot[] = [];
  for (let start = dayStart; start + stepMs <= dayEnd; start += stepMs) {
    slots.push({
      startTime: new Date(start),
      endTime: new Date(start + stepMs),
    });
  }
  return slots;
}
