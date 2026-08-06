import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { BookingsRepository } from './bookings.repository';

/**
 * Произвольный, но фиксированный ключ для pg_advisory_xact_lock — все
 * созданичя брони (независимо от типа события) должны сериализоваться
 * относительно друг друга, см. BookingsRepository.withExclusiveLock.
 */
const BOOKING_CREATION_LOCK_KEY = 872_364_591;

@Injectable()
export class TypeOrmBookingsRepository implements BookingsRepository {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly repository: Repository<BookingEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(booking: BookingEntity): Promise<BookingEntity> {
    return this.repository.save(booking);
  }

  async findAll(): Promise<BookingEntity[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<BookingEntity | undefined> {
    const found = await this.repository.findOne({ where: { id } });
    return found ?? undefined;
  }

  async update(
    id: string,
    patch: Partial<BookingEntity>,
  ): Promise<BookingEntity | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id };
    return this.repository.save(updated);
  }

  /**
   * [startTime, endTime) пересекается с [booking.startTime, booking.endTime),
   * когда startTime < booking.endTime AND endTime > booking.startTime.
   */
  async findAcceptedOverlapping(
    startTime: Date,
    endTime: Date,
  ): Promise<BookingEntity[]> {
    return this.repository
      .createQueryBuilder('booking')
      .where('booking.status = :status', { status: 'accepted' })
      .andWhere('booking.start_time < :endTime', { endTime })
      .andWhere('booking.end_time > :startTime', { startTime })
      .getMany();
  }

  async nullifyEventTypeId(eventTypeId: string): Promise<void> {
    await this.repository.update({ eventTypeId }, { eventTypeId: null });
  }

  async withExclusiveLock<T>(fn: () => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [
        BOOKING_CREATION_LOCK_KEY,
      ]);
      return fn();
    });
  }
}
