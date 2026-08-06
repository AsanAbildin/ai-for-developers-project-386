import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

/** См. models.tsp: EventTypeUpdate — все поля опциональны (частичное обновление). */
export class UpdateEventTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}
