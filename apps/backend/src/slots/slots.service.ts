import { Inject, Injectable } from '@nestjs/common';
import { NotFoundApiException } from '../common/errors/api.exception';
import { getBookingWindowDays } from '../common/scheduling/booking-window';
import { intervalsOverlap } from '../common/scheduling/overlap';
import { generateDaySlots } from '../common/scheduling/slot-generator';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../storage/bookings.repository';
import {
  EVENT_TYPES_REPOSITORY,
  EventTypesRepository,
} from '../storage/event-types.repository';

export interface SlotResponse {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

@Injectable()
export class SlotsService {
  constructor(
    @Inject(EVENT_TYPES_REPOSITORY)
    private readonly eventTypesRepository: EventTypesRepository,
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookingsRepository: BookingsRepository,
  ) {}

  /**
   * Свободные и занятые слоты типа события на 14 дней вперёд (см.
   * bookings.tsp: Slots_list). Занятость учитывает активные бронирования
   * всех типов событий.
   */
  async list(
    eventTypeId: string,
    now: Date = new Date(),
  ): Promise<SlotResponse[]> {
    const eventType = await this.eventTypesRepository.findById(eventTypeId);
    if (!eventType) {
      throw new NotFoundApiException(`Тип события "${eventTypeId}" не найден`);
    }

    const days = getBookingWindowDays(now);
    const allBookings = await this.bookingsRepository.findAll();
    const acceptedBookings = allBookings.filter(
      (booking) => booking.status === 'accepted',
    );

    return days
      .flatMap((day) => generateDaySlots(day, eventType.durationMinutes))
      .map((slot) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        isAvailable:
          slot.startTime >= now &&
          !acceptedBookings.some((booking) =>
            intervalsOverlap(
              slot.startTime,
              slot.endTime,
              booking.startTime,
              booking.endTime,
            ),
          ),
      }));
  }
}
