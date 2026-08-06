import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  BadRequestApiException,
  ConflictApiException,
  ForbiddenApiException,
  NotFoundApiException,
} from '../common/errors/api.exception';
import { isWithinBookingWindow } from '../common/scheduling/booking-window';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../storage/bookings.repository';
import { BookingEntity } from '../storage/entities/booking.entity';
import {
  EVENT_TYPES_REPOSITORY,
  EventTypesRepository,
} from '../storage/event-types.repository';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookingsRepository: BookingsRepository,
    @Inject(EVENT_TYPES_REPOSITORY)
    private readonly eventTypesRepository: EventTypesRepository,
  ) {}

  async create(
    dto: CreateBookingDto,
    now: Date = new Date(),
  ): Promise<BookingEntity> {
    const eventType = await this.eventTypesRepository.findById(
      dto.eventTypeId,
    );
    if (!eventType) {
      throw new BadRequestApiException(
        `Тип события "${dto.eventTypeId}" не найден`,
        'EVENT_TYPE_NOT_FOUND',
      );
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(
      startTime.getTime() + eventType.durationMinutes * 60_000,
    );

    if (!isWithinBookingWindow(startTime, now)) {
      throw new BadRequestApiException(
        'Выбранное время вне доступного окна записи (14 дней)',
        'OUT_OF_WINDOW',
      );
    }

    // Проверка пересечений и создание брони выполняются под общим
    // эксклюзивным локом хранилища (см. BookingsRepository.withExclusiveLock),
    // иначе два конкурентных запроса на один слот могли бы оба увидеть его
    // свободным до того, как любой из них успеет записать бронь.
    return this.bookingsRepository.withExclusiveLock(async () => {
      const conflicts = await this.bookingsRepository.findAcceptedOverlapping(
        startTime,
        endTime,
      );
      if (conflicts.length > 0) {
        throw new ConflictApiException(
          'Этот слот уже занят',
          'SLOT_UNAVAILABLE',
        );
      }

      const booking: BookingEntity = {
        id: randomUUID(),
        eventTypeId: eventType.id,
        eventTypeName: eventType.name,
        durationMinutes: eventType.durationMinutes,
        startTime,
        endTime,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail,
        status: 'accepted',
        createdAt: now,
        cancellationToken: randomUUID(),
      };
      return this.bookingsRepository.create(booking);
    });
  }

  /**
   * Все брони по всем типам событий, отсортированные по startTime.
   * Контракт (bookings.tsp: Bookings_list) не описывает фильтры по статусу
   * или дате, поэтому возвращаются все брони (включая отменённые) —
   * фронтенд отображает статус явным бейджем.
   */
  async findAll(): Promise<BookingEntity[]> {
    const bookings = await this.bookingsRepository.findAll();
    return [...bookings].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );
  }

  async cancelByOwner(
    id: string,
    dto: CancelBookingDto,
  ): Promise<BookingEntity> {
    const booking = await this.findByIdOrThrow(id);
    this.assertNotAlreadyCancelled(booking);
    const updated = await this.bookingsRepository.update(id, {
      status: 'cancelled',
      cancellationReason: dto.cancellationReason,
    });
    return updated as BookingEntity;
  }

  async cancelByGuest(
    id: string,
    cancellationToken: string,
    dto: CancelBookingDto,
  ): Promise<BookingEntity> {
    const booking = await this.findByIdOrThrow(id);
    if (booking.cancellationToken !== cancellationToken) {
      throw new ForbiddenApiException(
        'Неверный токен отмены бронирования',
        'INVALID_CANCELLATION_TOKEN',
      );
    }
    this.assertNotAlreadyCancelled(booking);
    const updated = await this.bookingsRepository.update(id, {
      status: 'cancelled',
      cancellationReason: dto.cancellationReason,
    });
    return updated as BookingEntity;
  }

  private async findByIdOrThrow(id: string): Promise<BookingEntity> {
    const booking = await this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundApiException(`Бронирование "${id}" не найдено`);
    }
    return booking;
  }

  private assertNotAlreadyCancelled(booking: BookingEntity): void {
    if (booking.status === 'cancelled') {
      throw new ConflictApiException(
        'Это бронирование уже отменено',
        'ALREADY_CANCELLED',
      );
    }
  }
}
