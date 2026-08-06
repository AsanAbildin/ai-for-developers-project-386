import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getTypeOrmConnectionOptions } from './typeorm-options';

/**
 * DataSource для TypeORM CLI (генерация/запуск/откат миграций), см. скрипты
 * migration:* в package.json. Отдельный от Nest DI, так как CLI запускается
 * вне контекста приложения.
 */
export default new DataSource({
  ...getTypeOrmConnectionOptions(),
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});
