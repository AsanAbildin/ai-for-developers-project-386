import { NotFoundApiException } from '../common/errors/api.exception';
import { InMemoryBookingsRepository } from '../storage/in-memory-bookings.repository';
import { InMemoryEventTypesRepository } from '../storage/in-memory-event-types.repository';
import { EventTypesService } from './event-types.service';

describe('EventTypesService', () => {
  let eventTypesRepository: InMemoryEventTypesRepository;
  let bookingsRepository: InMemoryBookingsRepository;
  let service: EventTypesService;

  beforeEach(() => {
    eventTypesRepository = new InMemoryEventTypesRepository();
    bookingsRepository = new InMemoryBookingsRepository();
    service = new EventTypesService(eventTypesRepository, bookingsRepository);
  });

  it('создаёт тип события с сгенерированным id', async () => {
    const created = await service.create({
      name: 'Consultation',
      description: 'desc',
      durationMinutes: 30,
    });

    expect(created.id).toBeTruthy();
    expect(await service.findAll()).toEqual([created]);
  });

  it('findByIdOrThrow бросает NotFoundApiException для неизвестного id', async () => {
    await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
      NotFoundApiException,
    );
  });

  it('update частично обновляет поля', async () => {
    const created = await service.create({
      name: 'Consultation',
      description: 'desc',
      durationMinutes: 30,
    });

    const updated = await service.update(created.id, { durationMinutes: 45 });

    expect(updated.durationMinutes).toBe(45);
    expect(updated.name).toBe('Consultation');
  });

  it('update бросает NotFoundApiException для неизвестного id', async () => {
    await expect(
      service.update('missing', { name: 'x' }),
    ).rejects.toThrow(NotFoundApiException);
  });

  it('delete удаляет тип и обнуляет eventTypeId у связанных броней', async () => {
    const created = await service.create({
      name: 'Consultation',
      description: 'desc',
      durationMinutes: 30,
    });

    await bookingsRepository.create({
      id: 'booking-1',
      eventTypeId: created.id,
      eventTypeName: created.name,
      durationMinutes: created.durationMinutes,
      startTime: new Date('2026-01-01T10:00:00Z'),
      endTime: new Date('2026-01-01T10:30:00Z'),
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
      status: 'accepted',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      cancellationToken: 'token',
    });

    await service.delete(created.id);

    expect(await eventTypesRepository.findById(created.id)).toBeUndefined();
    const booking = await bookingsRepository.findById('booking-1');
    expect(booking?.eventTypeId).toBeNull();
    // Снэпшот сохраняется даже после удаления типа.
    expect(booking?.eventTypeName).toBe('Consultation');
    expect(booking?.durationMinutes).toBe(30);
  });

  it('delete бросает NotFoundApiException для неизвестного id', async () => {
    await expect(service.delete('missing')).rejects.toThrow(
      NotFoundApiException,
    );
  });
});
