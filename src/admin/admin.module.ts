import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { AdminAggregation } from './admin.aggregation';
import { EarningService } from 'src/earning/earning.service';
import { PaymentService } from 'src/payment/payment.service';
import { BookingService } from 'src/booking/booking.service';
import * as moment from 'moment';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModule } from 'src/notification/notification.module';


@Module({
  imports: [NotificationModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAggregation, PaymentService],
  exports: [AdminService]
})
export class AdminModule { }
