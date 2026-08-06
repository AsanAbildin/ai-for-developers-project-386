import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConnectionOptions } from './typeorm-options';

/**
 * Подключение к PostgreSQL для STORAGE_DRIVER=postgres (см. storage.module.ts
 * и .env.example). Миграции применяются отдельно (npm run migration:run),
 * поэтому здесь synchronize/migrationsRun не включаются.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...getTypeOrmConnectionOptions(),
      migrations: [__dirname + '/migrations/*.{ts,js}'],
    }),
  ],
})
export class DatabaseModule {}
