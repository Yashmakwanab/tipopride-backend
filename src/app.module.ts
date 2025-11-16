import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { ConfigModule } from '@nestjs/config';
import { CustomerModule } from './customer/customer.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { DriverModule } from './driver/driver.module';
import { VehicleModule } from './vehicle/vehicle.module';

import { CouponModule } from './coupon/coupon.module';
import { AdminModule } from './admin/admin.module';
import { BookingModule } from './booking/booking.module';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { RolesGuard } from './auth/guard/role.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { CronjobService } from './cronjob/cronjob.service';
import { ReviewModule } from './review/review.module';
import { EarningModule } from './earning/earning.module';
import { ChatModule } from './chat/chat.module';
import { PaymentModule } from './payment/payment.module';
import { CardModule } from './card/card.module';
import { WalletModule } from './wallet/wallet.module';
import * as stripe from 'nestjs-stripe';
import { BankModule } from './bank/bank.module';
import { SurchargeModule } from './surcharge/surcharge.module';
import { StaffModule } from './staff/staff.module';

import { ComplaintModule } from './complaint/complaint.module';
import { ContactusModule } from './contactus/contactus.module';
import { FaqModule } from './faq/faq.module';
import { ContentPageModule } from './content-page/content-page.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { CompanyModule } from './company/company.module';
import { NotificationModule } from './notification/notification.module';
import { ActivityModule } from './activity/activity.module';
import { IpAddressModule } from './ip-address/ip-address.module';

@Module({
  imports: [
    DbModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    stripe.StripeModule.forRootAsync({
      useFactory: () => ({
        apiKey: process.env.STRIPE_SECRET_KEY,
        apiVersion: '2024-04-10'
      })
    }),
    ScheduleModule.forRoot(),

    AuthModule,
    AdminModule,
    CustomerModule,
    CommonModule,
    DriverModule,
    VehicleModule,

    CouponModule,
    BookingModule,
    ReviewModule,
    EarningModule,
    ChatModule,
    PaymentModule,
    CardModule,
    WalletModule,
    BankModule,
    SurchargeModule,
    StaffModule,
    ComplaintModule,
    ContactusModule,
    FaqModule,
    ContentPageModule,
    ConfigurationModule,
    CompanyModule,
    NotificationModule,
    ActivityModule,
    IpAddressModule,
  ],
  controllers: [AppController],
  providers: [AppService, CronjobService,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },]
})
export class AppModule { }
