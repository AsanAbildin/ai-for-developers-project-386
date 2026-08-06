import { BookingEntity } from '../../storage/entities/booking.entity';

export interface BookingResponse {
  id: string;
  eventTypeId: string | null;
  eventTypeName: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  guestName: string;
  guestEmail: string;
  status: 'accepted' | 'cancelled';
  cancellationReason?: string;
  createdAt: string;
}

export interface BookingCreateResultResponse extends BookingResponse {
  cancellationToken: string;
}

/**
 * Публичный вид брони (models.tsp: Booking) — без cancellationToken.
 * Токен возвращается только сразу после создания, см. toBookingCreateResult.
 */
export function toBookingResponse(entity: BookingEntity): BookingResponse {
  return {
    id: entity.id,
    eventTypeId: entity.eventTypeId,
    eventTypeName: entity.eventTypeName,
    durationMinutes: entity.durationMinutes,
    startTime: entity.startTime.toISOString(),
    endTime: entity.endTime.toISOString(),
    guestName: entity.guestName,
    guestEmail: entity.guestEmail,
    status: entity.status,
    cancellationReason: entity.cancellationReason,
    createdAt: entity.createdAt.toISOString(),
  };
}

/** models.tsp: BookingCreateResult — единственный момент, когда отдаём токен. */
export function toBookingCreateResultResponse(
  entity: BookingEntity,
): BookingCreateResultResponse {
  return {
    ...toBookingResponse(entity),
    cancellationToken: entity.cancellationToken,
  };
}
