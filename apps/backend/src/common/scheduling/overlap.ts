/**
 * Пересекаются ли два полуоткрытых интервала [aStart, aEnd) и [bStart, bEnd).
 * Используется одинаково при генерации слотов (isAvailable) и при проверке
 * конфликта в момент создания брони — чтобы правило занятости
 * ("на одно и то же время нельзя создать две записи, даже если это разные
 * типы событий") работало идентично в обоих местах.
 */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
