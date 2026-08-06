import { Module } from '@nestjs/common';
import { BookingsModule } from './bookings/bookings.module';
import { EventTypesModule } from './event-types/event-types.module';
import { SlotsModule } from './slots/slots.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    StorageModule.register(),
    EventTypesModule,
    BookingsModule,
    SlotsModule,
  ],
})
export class AppModule {}
