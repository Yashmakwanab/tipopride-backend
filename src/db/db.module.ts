import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';

import { MongooseModule, Schema } from '@nestjs/mongoose';
import { config } from 'dotenv';
import { Customers, CustomersModel } from 'src/customer/schema/customer.schema';
import { Sessions, SessionsModel } from 'src/customer/schema/session.schema';
import { Drivers, DriversModel } from 'src/driver/schema/driver.schema';
import { VehiclesPricesModel, VehiclesPrices } from 'src/vehicle/schema/vehicle.schema';

import { Coupons, CouponsModel } from 'src/coupon/schema/coupon.schema';
import { Admin, AdminModel } from 'src/admin/schema/admin.schema';
import {
  Vehicle_details,
  Vehicle_detailsModel,
} from 'src/driver/schema/vehicle-detail.schema';
import {
  DocumentsDetails,
  DocumentsDetailsModel,
} from 'src/driver/schema/documents-details.schema';
import {
  Customer_Address,
  Customer_AddressModel,
} from 'src/customer/schema/customer.address.schema';
import { Booking, BookingModel } from 'src/booking/schema/booking.schema';
import {
  Booking_notifications,
  Booking_notificationsModel,
} from 'src/booking/schema/booking-notification.schema';
import {
  Declined_bookings,
  Declined_bookingsModel,
} from 'src/booking/schema/declined-bookings.schema';
import { Reviews, ReviewsModel } from 'src/review/schema/reviews.schema';
import { DriverEarnings, DriverEarningsModel } from 'src/earning/schema/driver-earnings.schema';
import { ChatModule } from 'src/chat/chat.module';
import { Chats, ChatsModel } from 'src/chat/schema/chat.schema';
import { Connections, ConnectionsModel } from 'src/chat/schema/connection.schema';
import { Payments, PaymentsModel } from 'src/payment/schema/payment.schema';
import { Cards, CardsModel } from 'src/card/schema/cards.schema';
import { Wallets, WalletsModel } from 'src/wallet/schema/wallet.schema';
import { Banks, BanksModel } from 'src/bank/schema/bank.schema';
import { Languages, LanguagesModel } from 'src/admin/schema/language.schema';
import { SurchargeDates, SurchargeDatesModel } from 'src/surcharge/schema/surcharge-dates.schema';
import { Vehicle_types, Vehicle_typesModel } from 'src/vehicle/schema/vehicle-type.schema';
import { Complaints, ComplaintsModel } from 'src/complaint/schema/complaint.schema';
import { Contactus, ContactusModel } from 'src/contactus/schema/contactus.schema';
import { Faqs, FaqsModel } from 'src/faq/schema/faq.schema';
import { Pages, PagesModel } from 'src/content-page/schema/page.schema';
import { AppConfiguration, AppConfigurationModel } from 'src/configuration/schema/app-configuration.schema';
import { DocsUpdateHistory, DocsUpdateHistoryModel } from 'src/driver/schema/docs-update-history';
import { Tax, TaxModel } from 'src/payment/schema/tax.schema';
import { SurchargeHistory, SurchargeHistoryModel } from 'src/surcharge/schema/surcharge-history.schema';
import { Company, CompanyModel } from 'src/company/schema/company.schema';
import { DriverPayoutHistory, DriverPayoutHistoryModel } from 'src/driver/schema/driver-payout-history.schema';
import { Notification, NotificationModel } from 'src/notification/schema/notification.schema';

config();
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.DB_URL,
      }),
    }),
    MongooseModule.forFeature([
      { name: Customers.name, schema: CustomersModel },
      { name: Sessions.name, schema: SessionsModel },
      { name: Drivers.name, schema: DriversModel },
      { name: VehiclesPrices.name, schema: VehiclesPricesModel },
      { name: Vehicle_types.name, schema: Vehicle_typesModel },
      { name: Coupons.name, schema: CouponsModel },
      { name: Admin.name, schema: AdminModel },
      { name: Vehicle_details.name, schema: Vehicle_detailsModel },
      { name: DocumentsDetails.name, schema: DocumentsDetailsModel },
      { name: Customer_Address.name, schema: Customer_AddressModel },
      { name: Booking.name, schema: BookingModel },
      { name: Booking_notifications.name, schema: Booking_notificationsModel },
      { name: Declined_bookings.name, schema: Declined_bookingsModel },
      { name: Reviews.name, schema: ReviewsModel },
      { name: DriverEarnings.name, schema: DriverEarningsModel },
      { name: Chats.name, schema: ChatsModel },
      { name: Connections.name, schema: ConnectionsModel },
      { name: Payments.name, schema: PaymentsModel },
      { name: Cards.name, schema: CardsModel },
      { name: Wallets.name, schema: WalletsModel },
      { name: Banks.name, schema: BanksModel },
      { name: Languages.name, schema: LanguagesModel },
      { name: SurchargeDates.name, schema: SurchargeDatesModel },
      { name: Complaints.name, schema: ComplaintsModel },
      { name: Contactus.name, schema: ContactusModel },
      { name: Faqs.name, schema: FaqsModel },
      { name: Pages.name, schema: PagesModel },
      { name: AppConfiguration.name, schema: AppConfigurationModel },
      { name: DocsUpdateHistory.name, schema: DocsUpdateHistoryModel },
      { name: Tax.name, schema: TaxModel },
      { name: SurchargeHistory.name, schema: SurchargeHistoryModel },
      { name: Company.name, schema: CompanyModel },
      { name: DriverPayoutHistory.name, schema: DriverPayoutHistoryModel },
      { name: Notification.name, schema: NotificationModel },


    ]),

  ],
  providers: [DbService],
  exports: [DbService],
})
export class DbModule { }
