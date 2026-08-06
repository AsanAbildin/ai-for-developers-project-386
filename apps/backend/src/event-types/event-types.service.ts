import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NotFoundApiException } from '../common/errors/api.exception';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../storage/bookings.repository';
import { EventTypeEntity } from '../storage/entities/event-type.entity';
import {
  EVENT_TYPES_REPOSITORY,
  EventTypesRepository,
} from '../storage/event-types.repository';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import { UpdateEventTypeDto } from './dto/update-event-type.dto';

@Injectable()
export class EventTypesService {
  constructor(
    @Inject(EVENT_TYPES_REPOSITORY)
    private readonly eventTypesRepository: EventTypesRepository,
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookingsRepository: BookingsRepository,
  ) {}

  async create(dto: CreateEventTypeDto): Promise<EventTypeEntity> {
    const eventType: EventTypeEntity = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      durationMinutes: dto.durationMinutes,
    };
    return this.eventTypesRepository.create(eventType);
  }

  async findAll(): Promise<EventTypeEntity[]> {
    return this.eventTypesRepository.findAll();
  }

  async findByIdOrThrow(id: string): Promise<EventTypeEntity> {
    const eventType = await this.eventTypesRepository.findById(id);
    if (!eventType) {
      throw new NotFoundApiException(`Тип события "${id}" не найден`);
    }
    return eventType;
  }

  async update(
    id: string,
    dto: UpdateEventTypeDto,
  ): Promise<EventTypeEntity> {
    await this.findByIdOrThrow(id);
    const updated = await this.eventTypesRepository.update(id, dto);
    if (!updated) {
      throw new NotFoundApiException(`Тип события "${id}" не найден`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.findByIdOrThrow(id);
    await this.eventTypesRepository.delete(id);
    // Существующие брони этого типа не удаляются: они хранят снэпшот
    // name/durationMinutes, но ссылку на удалённый тип нужно обнулить
    // (см. models.tsp: Booking.eventTypeId может быть null).
    await this.bookingsRepository.nullifyEventTypeId(id);
  }
}
