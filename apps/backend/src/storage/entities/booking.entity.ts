import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type BookingStatus = 'accepted' | 'cancelled';

/**
 * Внутреннее представление брони, включает cancellationToken — он не
 * должен попадать в публичный ответ Booking (только в BookingCreateResult
 * сразу после создания). См. bookings/mappers/booking.mapper.ts.
 *
 * eventTypeId хранится как обычная nullable-колонка (без FK-констрейнта):
 * при удалении типа события ссылка обнуляется явно в репозитории
 * (см. BookingsRepository.nullifyEventTypeId), а не через ON DELETE SET NULL,
 * чтобы поведение не зависело от драйвера хранилища (in-memory/Postgres).
 */
@Entity({ name: 'bookings' })
@Index(['startTime', 'endTime'])
export class BookingEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'event_type_id', type: 'uuid', nullable: true })
  eventTypeId: string | null;

  @Column({ name: 'event_type_name' })
  eventTypeName: string;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ name: 'guest_name' })
  guestName: string;

  @Column({ name: 'guest_email' })
  guestEmail: string;

  @Column({ type: 'varchar' })
  status: BookingStatus;

  @Column({ name: 'cancellation_reason', type: 'varchar', nullable: true })
  cancellationReason?: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'cancellation_token' })
  cancellationToken: string;
}
