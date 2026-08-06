import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventTypeEntity } from './entities/event-type.entity';
import { EventTypesRepository } from './event-types.repository';

@Injectable()
export class TypeOrmEventTypesRepository implements EventTypesRepository {
  constructor(
    @InjectRepository(EventTypeEntity)
    private readonly repository: Repository<EventTypeEntity>,
  ) {}

  async create(eventType: EventTypeEntity): Promise<EventTypeEntity> {
    return this.repository.save(eventType);
  }

  async findAll(): Promise<EventTypeEntity[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<EventTypeEntity | undefined> {
    const found = await this.repository.findOne({ where: { id } });
    return found ?? undefined;
  }

  async update(
    id: string,
    patch: Partial<EventTypeEntity>,
  ): Promise<EventTypeEntity | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id };
    return this.repository.save(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
