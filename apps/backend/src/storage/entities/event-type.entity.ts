import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'event_types' })
export class EventTypeEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;
}
