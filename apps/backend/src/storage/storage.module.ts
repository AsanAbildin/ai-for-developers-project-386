import { DynamicModule, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database/database.module';
import { EVENT_TYPES_REPOSITORY } from './event-types.repository';
import { InMemoryEventTypesRepository } from './in-memory-event-types.repository';
import { BOOKINGS_REPOSITORY } from './bookings.repository';
import { InMemoryBookingsRepository } from './in-memory-bookings.repository';
import { TypeOrmEventTypesRepository } from './typeorm-event-types.repository';
import { TypeOrmBookingsRepository } from './typeorm-bookings.repository';
import { EventTypeEntity } from './entities/event-type.entity';
import { BookingEntity } from './entities/booking.entity';

/**
 * Хранилище спрятано за интерфейсами/токенами (BookingsRepository,
 * EventTypesRepository), поэтому выбор реализации не требует изменений в
 * бизнес-логике модулей EventTypes/Bookings/Slots.
 *
 * Драйвер выбирается через STORAGE_DRIVER (см. .env.example):
 * - "postgres" (по умолчанию) — данные хранятся в PostgreSQL (см.
 *   docker-compose.yml и apps/backend/src/database).
 * - "memory" — данные хранятся в процессе и сбрасываются при перезапуске
 *   (быстрый старт без БД, используется также в unit-тестах сервисов).
 */
@Global()
@Module({})
export class StorageModule {
  static register(): DynamicModule {
    const driver = process.env.STORAGE_DRIVER ?? 'postgres';

    if (driver === 'memory') {
      return {
        module: StorageModule,
        providers: [
          { provide: EVENT_TYPES_REPOSITORY, useClass: InMemoryEventTypesRepository },
          { provide: BOOKINGS_REPOSITORY, useClass: InMemoryBookingsRepository },
        ],
        exports: [EVENT_TYPES_REPOSITORY, BOOKINGS_REPOSITORY],
      };
    }

    return {
      module: StorageModule,
      imports: [
        DatabaseModule,
        TypeOrmModule.forFeature([EventTypeEntity, BookingEntity]),
      ],
      providers: [
        { provide: EVENT_TYPES_REPOSITORY, useClass: TypeOrmEventTypesRepository },
        { provide: BOOKINGS_REPOSITORY, useClass: TypeOrmBookingsRepository },
      ],
      exports: [EVENT_TYPES_REPOSITORY, BOOKINGS_REPOSITORY],
    };
  }
}
