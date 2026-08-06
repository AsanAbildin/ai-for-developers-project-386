import { IsInt, IsString, Min, MinLength } from 'class-validator';

/** См. models.tsp: EventTypeCreate. */
export class CreateEventTypeDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  durationMinutes!: number;
}
