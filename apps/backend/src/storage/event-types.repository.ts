import { EventTypeEntity } from './entities/event-type.entity';

export const EVENT_TYPES_REPOSITORY = 'EVENT_TYPES_REPOSITORY';

export interface EventTypesRepository {
  create(eventType: EventTypeEntity): Promise<EventTypeEntity>;
  findAll(): Promise<EventTypeEntity[]>;
  findById(id: string): Promise<EventTypeEntity | undefined>;
  update(
    id: string,
    patch: Partial<EventTypeEntity>,
  ): Promise<EventTypeEntity | undefined>;
  delete(id: string): Promise<boolean>;
}
