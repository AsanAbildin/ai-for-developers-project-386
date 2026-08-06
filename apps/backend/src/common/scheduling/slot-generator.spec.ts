import { generateDaySlots } from './slot-generator';

describe('generateDaySlots', () => {
  const day = new Date('2026-01-01T00:00:00Z');

  it('генерирует слоты подряд без промежутков с шагом durationMinutes', () => {
    const slots = generateDaySlots(day, 30);

    expect(slots).toHaveLength(48);
    expect(slots[0]?.startTime.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(slots[0]?.endTime.toISOString()).toBe('2026-01-01T00:30:00.000Z');
    expect(slots[1]?.startTime.toISOString()).toBe('2026-01-01T00:30:00.000Z');
    expect(slots[47]?.endTime.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });

  it('отбрасывает хвостовой слот, не помещающийся до полуночи', () => {
    // 24ч * 60мин = 1440 минут; 1440 / 100 = 14.4 → 14 полных слотов по 100 мин
    const slots = generateDaySlots(day, 100);
    expect(slots).toHaveLength(14);
    expect(slots[13]?.endTime.getTime()).toBeLessThanOrEqual(
      new Date('2026-01-02T00:00:00Z').getTime(),
    );
  });

  it('один слот на весь день при durationMinutes = 1440', () => {
    const slots = generateDaySlots(day, 24 * 60);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.startTime.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(slots[0]?.endTime.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });
});
