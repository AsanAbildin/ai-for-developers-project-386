import { intervalsOverlap } from './overlap';

describe('intervalsOverlap', () => {
  const start = (s: string) => new Date(s);

  it('true при полном совпадении интервалов', () => {
    expect(
      intervalsOverlap(
        start('2026-01-01T10:00:00Z'),
        start('2026-01-01T10:30:00Z'),
        start('2026-01-01T10:00:00Z'),
        start('2026-01-01T10:30:00Z'),
      ),
    ).toBe(true);
  });

  it('true при частичном пересечении', () => {
    expect(
      intervalsOverlap(
        start('2026-01-01T10:00:00Z'),
        start('2026-01-01T10:30:00Z'),
        start('2026-01-01T10:15:00Z'),
        start('2026-01-01T10:45:00Z'),
      ),
    ).toBe(true);
  });

  it('false, когда один интервал заканчивается ровно в начале другого (полуоткрытые интервалы)', () => {
    expect(
      intervalsOverlap(
        start('2026-01-01T10:00:00Z'),
        start('2026-01-01T10:30:00Z'),
        start('2026-01-01T10:30:00Z'),
        start('2026-01-01T11:00:00Z'),
      ),
    ).toBe(false);
  });

  it('false для непересекающихся интервалов', () => {
    expect(
      intervalsOverlap(
        start('2026-01-01T10:00:00Z'),
        start('2026-01-01T10:30:00Z'),
        start('2026-01-01T12:00:00Z'),
        start('2026-01-01T12:30:00Z'),
      ),
    ).toBe(false);
  });

  it('true, когда один интервал полностью содержит другой', () => {
    expect(
      intervalsOverlap(
        start('2026-01-01T10:00:00Z'),
        start('2026-01-01T12:00:00Z'),
        start('2026-01-01T10:30:00Z'),
        start('2026-01-01T10:45:00Z'),
      ),
    ).toBe(true);
  });
});
