import {
  BadRequestApiException,
  ConflictApiException,
  ForbiddenApiException,
  NotFoundApiException,
} from '../common/errors/api.exception';
import { InMemoryBookingsRepository } from '../storage/in-memory-bookings.repository';
import { InMemoryEventTypesRepository } from '../storage/in-memory-event-types.repository';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let eventTypesRepository: InMemoryEventTypesRepository;
  let bookingsRepository: InMemoryBookingsRepository;
  let service: BookingsService;
  const now = new Date('2026-01-01T12:00:00Z');

  beforeEach(() => {
    eventTypesRepository = new InMemoryEventTypesRepository();
    bookingsRepository = new InMemoryBookingsRepository();
    service = new BookingsService(bookingsRepository, eventTypesRepository);
  });

  function createEventType(durationMinutes: number, name = 'Meeting') {
    return eventTypesRepository.create({
      id: `event-type-${name}-${durationMinutes}`,
      name,
      description: 'desc',
      durationMinutes,
    });
  }

  describe('create', () => {
    it('создаёт бронирование со снэпшотом типа события и cancellationToken', async () => {
      const eventType = await createEventType(30);

      const booking = await service.create(
        {
          eventTypeId: eventType.id,
          startTime: '2026-01-01T13:00:00Z',
          guestName: 'Ivan',
          guestEmail: 'ivan@example.com',
        },
        now,
      );

      expect(booking.status).toBe('accepted');
      expect(booking.eventTypeName).toBe('Meeting');
      expect(booking.durationMinutes).toBe(30);
      expect(booking.endTime.toISOString()).toBe('2026-01-01T13:30:00.000Z');
      expect(booking.cancellationToken).toBeTruthy();
    });

    it('бросает BadRequestApiException(EVENT_TYPE_NOT_FOUND) для неизвестного типа', async () => {
      await expect(
        service.create(
          {
            eventTypeId: 'missing',
            startTime: '2026-01-01T13:00:00Z',
            guestName: 'Ivan',
            guestEmail: 'ivan@example.com',
          },
          now,
        ),
      ).rejects.toThrow(BadRequestApiException);
    });

    it('бросает OUT_OF_WINDOW для времени в прошлом', async () => {
      const eventType = await createEventType(30);

      await expect(
        service.create(
          {
            eventTypeId: eventType.id,
            startTime: '2026-01-01T11:00:00Z',
            guestName: 'Ivan',
            guestEmail: 'ivan@example.com',
          },
          now,
        ),
      ).rejects.toThrow(BadRequestApiException);
    });

    it('бросает OUT_OF_WINDOW для времени за пределами 14 дней', async () => {
      const eventType = await createEventType(30);

      await expect(
        service.create(
          {
            eventTypeId: eventType.id,
            startTime: '2026-02-01T00:00:00Z',
            guestName: 'Ivan',
            guestEmail: 'ivan@example.com',
          },
          now,
        ),
      ).rejects.toThrow(BadRequestApiException);
    });

    it('бросает SLOT_UNAVAILABLE при пересечении с бронью другого типа события', async () => {
      const eventType30 = await createEventType(30, 'Short');
      const eventType60 = await createEventType(60, 'Long');

      await service.create(
        {
          eventTypeId: eventType30.id,
          startTime: '2026-01-01T13:00:00Z',
          guestName: 'Ivan',
          guestEmail: 'ivan@example.com',
        },
        now,
      );

      await expect(
        service.create(
          {
            eventTypeId: eventType60.id,
            startTime: '2026-01-01T13:15:00Z',
            guestName: 'Petr',
            guestEmail: 'petr@example.com',
          },
          now,
        ),
      ).rejects.toThrow(ConflictApiException);
    });

    it('позволяет забронировать смежный (не пересекающийся) слот другого типа', async () => {
      const eventType30 = await createEventType(30, 'Short');
      const eventType60 = await createEventType(60, 'Long');

      await service.create(
        {
          eventTypeId: eventType30.id,
          startTime: '2026-01-01T13:00:00Z',
          guestName: 'Ivan',
          guestEmail: 'ivan@example.com',
        },
        now,
      );

      await expect(
        service.create(
          {
            eventTypeId: eventType60.id,
            startTime: '2026-01-01T13:30:00Z',
            guestName: 'Petr',
            guestEmail: 'petr@example.com',
          },
          now,
        ),
      ).resolves.not.toThrow();
    });

    it('не мешает бронированию, если конфликтующая бронь отменена', async () => {
      const eventType = await createEventType(30);

      const first = await service.create(
        {
          eventTypeId: eventType.id,
          startTime: '2026-01-01T13:00:00Z',
          guestName: 'Ivan',
          guestEmail: 'ivan@example.com',
        },
        now,
      );
      await service.cancelByOwner(first.id, {});

      await expect(
        service.create(
          {
            eventTypeId: eventType.id,
            startTime: '2026-01-01T13:00:00Z',
            guestName: 'Petr',
            guestEmail: 'petr@example.com',
          },
          now,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('findAll', () => {
    it('возвращает брони, отсортированные по startTime', async () => {
      const eventType = await createEventType(30);
      await service.create(
        {
          eventTypeId: eventType.id,
          startTime: '2026-01-02T10:00:00Z',
          guestName: 'A',
          guestEmail: 'a@example.com',
        },
        now,
      );
      await service.create(
        {
          eventTypeId: eventType.id,
          startTime: '2026-01-01T15:00:00Z',
          guestName: 'B',
          guestEmail: 'b@example.com',
        },
        now,
      );

      const result = await service.findAll();
      expect(result.map((b) => b.guestName)).toEqual(['B', 'A']);
    });
  });

  describe('cancelByOwner', () => {
    it('отменяет бронирование и сохраняет причину', async () => {
      const eventType = await createEventType(30);
      const booking = await service.create(
        {
          eventTypeId: eventType.id,
          startTime: '2026-01-01T13:00:00Z',
          guestName: 'Ivan',
          guestEmail: 'ivan@example.com',
        },
        now,
      );

      const cancelled = await service.cancelByOwner(booking.id, {
        cancellationReason: 'busy',
      });

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellationReason).toBe('busy');
    });

    it('бросает NotFoundApiException для неизвестной брони', async () => {
      await expect(service.cancelByOwner('missing', {})).rejects.toThrow(
        NotFoundApiException,
      );
    });

    it('бросает ConflictApiException при повторной отмене', async () => {
      const eventType = await createEventType(30);
      const booking = await service.create(
        {
          eventTypeId: eventType.id,
          startTime: '2026-01-01T13:00:00Z',
          guestName: 'Ivan',
          guestEmail: 'ivan@example.com',
        },
        now,
      );
      await service.cancelByOwner(booking.id, {});

      await expect(service.cancelByOwner(booking.id, {})).rejects.toThrow(
        ConflictApiException,
      );
    });
  });

  describe('cancelByGuest', () => {
    it('отменяет бронирование при верном токене', async () => {
      const eventType = await createEventType(30);
      const booking = await service.create(
        {
          eventTypeId: eventType.id,
          startTime: '2026-01-01T13:00:00Z',
          guestName: 'Ivan',
          guestEmail: 'ivan@example.com',
        },
        now,
      );

      const cancelled = await service.cancelByGuest(
        booking.id,
        booking.cancellationToken,
        {},
      );

      expect(cancelled.status).toBe('cancelled');
    });

    it('бросает ForbiddenApiException при неверном токене', async () => {
      const eventType = await createEventType(30);
      const booking = await service.create(
        {
          eventTypeId: eventType.id,
          startTime: '2026-01-01T13:00:00Z',
          guestName: 'Ivan',
          guestEmail: 'ivan@example.com',
        },
        now,
      );

      await expect(
        service.cancelByGuest(booking.id, 'wrong-token', {}),
      ).rejects.toThrow(ForbiddenApiException);
    });

    it('бросает ConflictApiException при повторной отмене', async () => {
      const eventType = await createEventType(30);
      const booking = await service.create(
        {
          eventTypeId: eventType.id,
          startTime: '2026-01-01T13:00:00Z',
          guestName: 'Ivan',
          guestEmail: 'ivan@example.com',
        },
        now,
      );
      await service.cancelByGuest(booking.id, booking.cancellationToken, {});

      await expect(
        service.cancelByGuest(booking.id, booking.cancellationToken, {}),
      ).rejects.toThrow(ConflictApiException);
    });
  });
});
