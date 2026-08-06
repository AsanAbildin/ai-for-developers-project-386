import { Injectable } from '@nestjs/common';
import { EventTypeEntity } from './entities/event-type.entity';
import { EventTypesRepository } from './event-types.repository';

@Injectable()
export class InMemoryEventTypesRepository implements EventTypesRepository {
  private readonly items = new Map<string, EventTypeEntity>();

  create(eventType: EventTypeEntity): Promise<EventTypeEntity> {
    this.items.set(eventType.id, eventType);
    return Promise.resolve(eventType);
  }

  findAll(): Promise<EventTypeEntity[]> {
    return Promise.resolve([...this.items.values()]);
  }

  findById(id: string): Promise<EventTypeEntity | undefined> {
    return Promise.resolve(this.items.get(id));
  }

  update(
    id: string,
    patch: Partial<EventTypeEntity>,
  ): Promise<EventTypeEntity | undefined> {
    const existing = this.items.get(id);
    if (!existing) return Promise.resolve(undefined);
    const updated = { ...existing, ...patch, id };
    this.items.set(id, updated);
    return Promise.resolve(updated);
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(this.items.delete(id));
  }
}
