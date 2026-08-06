import { Injectable } from '@nestjs/common';
import { intervalsOverlap } from '../common/scheduling/overlap';
import { BookingEntity } from './entities/booking.entity';
import { BookingsRepository } from './bookings.repository';

@Injectable()
export class InMemoryBookingsRepository implements BookingsRepository {
  private readonly items = new Map<string, BookingEntity>();

  create(booking: BookingEntity): Promise<BookingEntity> {
    this.items.set(booking.id, booking);
    return Promise.resolve(booking);
  }

  findAll(): Promise<BookingEntity[]> {
    return Promise.resolve([...this.items.values()]);
  }

  findById(id: string): Promise<BookingEntity | undefined> {
    return Promise.resolve(this.items.get(id));
  }

  update(
    id: string,
    patch: Partial<BookingEntity>,
  ): Promise<BookingEntity | undefined> {
    const existing = this.items.get(id);
    if (!existing) return Promise.resolve(undefined);
    const updated = { ...existing, ...patch, id };
    this.items.set(id, updated);
    return Promise.resolve(updated);
  }

  findAcceptedOverlapping(
    startTime: Date,
    endTime: Date,
  ): Promise<BookingEntity[]> {
    const all = [...this.items.values()];
    return Promise.resolve(
      all.filter(
        (booking) =>
          booking.status === 'accepted' &&
          intervalsOverlap(
            startTime,
            endTime,
            booking.startTime,
            booking.endTime,
          ),
      ),
    );
  }

  nullifyEventTypeId(eventTypeId: string): Promise<void> {
    for (const booking of this.items.values()) {
      if (booking.eventTypeId === eventTypeId) {
        booking.eventTypeId = null;
      }
    }
    return Promise.resolve();
  }

  withExclusiveLock<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
