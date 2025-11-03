import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { CommonService } from 'src/common/common.service';
import { BookingService } from 'src/booking/booking.service';
import { EarningModule } from 'src/earning/earning.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [EarningModule, NotificationModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService]
})
export class PaymentModule { }
