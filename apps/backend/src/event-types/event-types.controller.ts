import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import { UpdateEventTypeDto } from './dto/update-event-type.dto';
import { EventTypesService } from './event-types.service';

/** См. event-types.tsp: interface EventTypes, @route("/event-types"). */
@Controller('event-types')
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEventTypeDto) {
    return this.eventTypesService.create(dto);
  }

  @Get()
  list() {
    return this.eventTypesService.findAll();
  }

  @Get(':id')
  read(@Param('id') id: string) {
    return this.eventTypesService.findByIdOrThrow(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventTypeDto) {
    return this.eventTypesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.eventTypesService.delete(id);
  }
}
