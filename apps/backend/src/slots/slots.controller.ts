import { Controller, Get, Param } from '@nestjs/common';
import { SlotsService } from './slots.service';

/** См. bookings.tsp: interface Slots, @route("/event-types/{eventTypeId}/slots"). */
@Controller('event-types/:eventTypeId/slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get()
  list(@Param('eventTypeId') eventTypeId: string) {
    return this.slotsService.list(eventTypeId);
  }
}
