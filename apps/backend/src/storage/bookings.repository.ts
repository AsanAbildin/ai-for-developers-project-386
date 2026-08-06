import { BookingEntity } from './entities/booking.entity';

export const BOOKINGS_REPOSITORY = 'BOOKINGS_REPOSITORY';

export interface BookingsRepository {
  create(booking: BookingEntity): Promise<BookingEntity>;
  findAll(): Promise<BookingEntity[]>;
  findById(id: string): Promise<BookingEntity | undefined>;
  update(
    id: string,
    patch: Partial<BookingEntity>,
  ): Promise<BookingEntity | undefined>;
  /**
   * Активные (status = accepted) брони любого типа события, чей интервал
   * [startTime, endTime) пересекается с переданным. Реализует правило
   * занятости: на одно и то же время нельзя создать две записи, даже если
   * это разные типы событий.
   */
  findAcceptedOverlapping(
    startTime: Date,
    endTime: Date,
  ): Promise<BookingEntity[]>;
  /** Обнуляет eventTypeId у всех броней указанного типа (при его удалении). */
  nullifyEventTypeId(eventTypeId: string): Promise<void>;
  /**
   * Выполняет fn так, что между конкурентными вызовами гарантируется
   * взаимное исключение (глобальный лок на уровне хранилища). Используется
   * при создании брони: проверка пересечений и вставка должны быть
   * атомарны относительно других конкурентных созданий, иначе два
   * параллельных запроса могут одновременно "увидеть" слот свободным.
   * In-memory реализация не нуждается в реальном локе (Node однопоточен и
   * между проверкой и записью нет ввода-вывода), Postgres-реализация
   * использует pg_advisory_xact_lock.
   */
  withExclusiveLock<T>(fn: () => Promise<T>): Promise<T>;
}
