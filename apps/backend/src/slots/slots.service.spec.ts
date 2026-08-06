import { NotFoundApiException } from '../common/errors/api.exception';
import { InMemoryBookingsRepository } from '../storage/in-memory-bookings.repository';
import { InMemoryEventTypesRepository } from '../storage/in-memory-event-types.repository';
import { SlotsService } from './slots.service';

describe('SlotsService', () => {
  let eventTypesRepository: InMemoryEventTypesRepository;
  let bookingsRepository: InMemoryBookingsRepository;
  let service: SlotsService;
  const now = new Date('2026-01-01T12:00:00Z');

  beforeEach(() => {
    eventTypesRepository = new InMemoryEventTypesRepository();
    bookingsRepository = new InMemoryBookingsRepository();
    service = new SlotsService(eventTypesRepository, bookingsRepository);
  });

  it('бросает NotFoundApiException для неизвестного типа события', async () => {
    await expect(service.list('missing', now)).rejects.toThrow(
      NotFoundApiException,
    );
  });

  it('генерирует 14 * (24ч / durationMinutes) слотов', async () => {
    const eventType = await eventTypesRepository.create({
      id: 'et-1',
      name: 'Meeting',
      description: 'desc',
      durationMinutes: 60,
    });

    const slots = await service.list(eventType.id, now);

    expect(slots).toHaveLength(14 * 24);
  });

  it('помечает прошлые слоты сегодняшнего дня как недоступные', async () => {
    const eventType = await eventTypesRepository.create({
      id: 'et-1',
      name: 'Meeting',
      description: 'desc',
      durationMinutes: 60,
    });

    const slots = await service.list(eventType.id, now);

    const pastSlot = slots.find((s) => s.startTime === '2026-01-01T10:00:00.000Z');
    const futureSlot = slots.find((s) => s.startTime === '2026-01-01T13:00:00.000Z');

    expect(pastSlot?.isAvailable).toBe(false);
    expect(futureSlot?.isAvailable).toBe(true);
  });

  it('помечает слот недоступным, если он пересекается с активной бронью любого типа', async () => {
    const eventType30 = await eventTypesRepository.create({
      id: 'et-30',
      name: 'Short',
      description: 'desc',
      durationMinutes: 30,
    });
    const eventType60 = await eventTypesRepository.create({
      id: 'et-60',
      name: 'Long',
      description: 'desc',
      durationMinutes: 60,
    });

    await bookingsRepository.create({
      id: 'b-1',
      eventTypeId: eventType60.id,
      eventTypeName: eventType60.name,
      durationMinutes: eventType60.durationMinutes,
      startTime: new Date('2026-01-01T13:00:00Z'),
      endTime: new Date('2026-01-01T14:00:00Z'),
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
      status: 'accepted',
      createdAt: now,
      cancellationToken: 'token',
    });

    const slots = await service.list(eventType30.id, now);
    const overlapping = slots.find(
      (s) => s.startTime === '2026-01-01T13:30:00.000Z',
    );
    const notOverlapping = slots.find(
      (s) => s.startTime === '2026-01-01T14:00:00.000Z',
    );

    expect(overlapping?.isAvailable).toBe(false);
    expect(notOverlapping?.isAvailable).toBe(true);
  });

  it('не учитывает отменённые брони при расчёте занятости', async () => {
    const eventType = await eventTypesRepository.create({
      id: 'et-1',
      name: 'Meeting',
      description: 'desc',
      durationMinutes: 30,
    });

    await bookingsRepository.create({
      id: 'b-1',
      eventTypeId: eventType.id,
      eventTypeName: eventType.name,
      durationMinutes: eventType.durationMinutes,
      startTime: new Date('2026-01-01T13:00:00Z'),
      endTime: new Date('2026-01-01T13:30:00Z'),
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
      status: 'cancelled',
      createdAt: now,
      cancellationToken: 'token',
    });

    const slots = await service.list(eventType.id, now);
    const slot = slots.find((s) => s.startTime === '2026-01-01T13:00:00.000Z');

    expect(slot?.isAvailable).toBe(true);
  });
});
