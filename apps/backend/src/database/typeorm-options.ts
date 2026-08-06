import { BookingEntity } from '../storage/entities/booking.entity';
import { EventTypeEntity } from '../storage/entities/event-type.entity';

/**
 * Общие параметры подключения к PostgreSQL, читаемые из переменных
 * окружения. Используются как в NestJS-модуле (database.module.ts), так и
 * в отдельном DataSource для TypeORM CLI (data-source.ts), чтобы конфигурация
 * не расходилась между runtime-приложением и миграциями.
 */
export function getTypeOrmConnectionOptions() {
  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'scheduling',
    password: process.env.DB_PASSWORD ?? 'scheduling',
    database: process.env.DB_NAME ?? 'scheduling',
    entities: [EventTypeEntity, BookingEntity],
    // Схема управляется только миграциями — без авто-синхронизации.
    synchronize: false,
  };
}
