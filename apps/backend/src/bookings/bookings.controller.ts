import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { BadRequestApiException } from '../common/errors/api.exception';
import { BookingsService } from './bookings.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  toBookingCreateResultResponse,
  toBookingResponse,
} from './mappers/booking.mapper';

/** См. bookings.tsp: interface Bookings, @route("/bookings"). */
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBookingDto) {
    const booking = await this.bookingsService.create(dto);
    return toBookingCreateResultResponse(booking);
  }

  @Get()
  async list() {
    const bookings = await this.bookingsService.findAll();
    return bookings.map(toBookingResponse);
  }

  @Post(':id/cancel')
  async cancelByOwner(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    const booking = await this.bookingsService.cancelByOwner(id, dto);
    return toBookingResponse(booking);
  }

  @Post(':id/guest-cancel')
  async cancelByGuest(
    @Param('id') id: string,
    @Query('cancellationToken') cancellationToken: string | undefined,
    @Body() dto: CancelBookingDto,
  ) {
    if (!cancellationToken) {
      throw new BadRequestApiException(
        'Параметр cancellationToken обязателен',
        'MISSING_CANCELLATION_TOKEN',
      );
    }
    const booking = await this.bookingsService.cancelByGuest(
      id,
      cancellationToken,
      dto,
    );
    return toBookingResponse(booking);
  }
}
