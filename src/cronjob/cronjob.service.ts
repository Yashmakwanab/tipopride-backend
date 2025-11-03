import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingService } from 'src/booking/booking.service';
import { DriverService } from 'src/driver/driver.service';
import { PaymentService } from 'src/payment/payment.service';

@Injectable()
export class CronjobService {
  constructor(private readonly bookingService: BookingService,
    private readonly paymentService: PaymentService,
    private readonly driverService: DriverService,
  ) { }

  async onApplicationBootstrap(): Promise<void> { }

  @Cron('*/30 * * * * *')
  async handleCron() {
    try {
      await this.bookingService.scheduled_Booking_noti(); // Added parentheses to call the method
    } catch (error) {
      console.error('Error occurred:', error.message);
    }
  }

  // payout off
  // @Cron(CronExpression.EVERY_WEEKEND)
  // async sendPayoutToDrivers() {
  //   try {
  //     await this.paymentService.transferMoney(); // Added parentheses to call the method
  //   } catch (error) {
  //     console.error('Error occurred:', error.message);
  //   }
  // }


  @Cron('0 0 * * *')
  async handleCron3() {
    try {
      await this.driverService.check_Expiry_date(); // Added parentheses to call the method
    } catch (error) {
      console.error('Error occurred:', error.message);
    }
  }


  @Cron('*/30 * * * * *')
  async handleCron4() {
    try {
      await this.bookingService.WaitingChargeCron(); // Added parentheses to call the method
    } catch (error) {
      console.error('Error occurred:', error.message);
    }
  }
}
