/**
 * Клиентская пагинация массива. Контракт GET /bookings не поддерживает
 * серверную пагинацию (возвращает весь список), поэтому список бронирований
 * владельца режется на страницы во фронтенде.
 */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export function pageCount(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}
