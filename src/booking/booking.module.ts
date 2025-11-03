import { Global, Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { CommonService } from 'src/common/common.service';
import { BookingGateway } from './booking.gateway';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BookingAggregation } from './booking.aggregation';
import { DriverService } from 'src/driver/driver.service';
import { PaymentService } from 'src/payment/payment.service';
import { NotificationModule } from 'src/notification/notification.module';
import { ActivityModule } from 'src/activity/activity.module';
@Global()
@Module({
  imports: [EventEmitterModule.forRoot(), NotificationModule,ActivityModule],  
  controllers: [BookingController],
  providers: [BookingService, CommonService, BookingGateway, BookingAggregation, PaymentService],
  exports: [BookingService]
})
export class BookingModule { }
