import { z } from 'zod'

/** Схема формы создания/редактирования типа события (см. models.tsp: EventTypeCreate/Update). */
export const eventTypeFormSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  description: z.string(),
  durationMinutes: z.coerce.number().int().min(1, 'Длительность должна быть положительной')
})

export type EventTypeFormValues = z.infer<typeof eventTypeFormSchema>

/** Схема формы бронирования гостем (см. models.tsp: BookingCreate). */
export const bookingFormSchema = z.object({
  guestName: z.string().min(1, 'Укажите имя'),
  guestEmail: z.string().email('Некорректный email')
})

export type BookingFormValues = z.infer<typeof bookingFormSchema>

/** Схема формы отмены бронирования (причина не обязательна). */
export const cancelBookingFormSchema = z.object({
  cancellationReason: z.string().optional()
})

export type CancelBookingFormValues = z.infer<typeof cancelBookingFormSchema>
