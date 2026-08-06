import type { components } from '~/types/api'

export type Booking = components['schemas']['Booking']
export type BookingCreate = components['schemas']['BookingCreate']
export type BookingCreateResult = components['schemas']['BookingCreateResult']
export type BookingCancel = components['schemas']['BookingCancel']

/**
 * Доступ к ресурсу "бронирования".
 * create — публичный эндпоинт для гостя.
 * list/cancelByOwner — предполагаются только для владельца календаря.
 * cancelByGuest — требует cancellationToken, полученный при создании брони.
 */
export function useBookings() {
  const client = useApiClient()

  async function create(body: BookingCreate): Promise<BookingCreateResult> {
    const result = await client.POST('/bookings', { body })
    return unwrapApi(result)
  }

  async function list(): Promise<Booking[]> {
    const result = await client.GET('/bookings')
    return unwrapApi(result)
  }

  async function cancelByOwner(id: string, body: BookingCancel): Promise<Booking> {
    const result = await client.POST('/bookings/{id}/cancel', {
      params: { path: { id } },
      body
    })
    return unwrapApi(result)
  }

  async function cancelByGuest(id: string, cancellationToken: string, body: BookingCancel): Promise<Booking> {
    const result = await client.POST('/bookings/{id}/guest-cancel', {
      params: { path: { id }, query: { cancellationToken } },
      body
    })
    return unwrapApi(result)
  }

  return { create, list, cancelByOwner, cancelByGuest }
}
