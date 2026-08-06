import { IsOptional, IsString } from 'class-validator';

/** См. models.tsp: BookingCancel. */
export class CancelBookingDto {
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
