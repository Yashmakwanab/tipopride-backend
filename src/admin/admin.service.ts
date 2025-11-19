import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import { DbService } from 'src/db/db.service';
import { NotificationDto, SignInDto } from './dto/admin.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AdminAggregation } from './admin.aggregation';
import { CommonService } from 'src/common/common.service';
import { EarningService } from 'src/earning/earning.service';
import { hash } from 'crypto';
import { messaging } from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { PaymentService } from 'src/payment/payment.service';
import * as moment from 'moment';
import { Booking, BookingStatus } from 'src/booking/schema/booking.schema';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { EmailService } from 'src/common/common.emails.sesrvice';
import { NotificationService } from 'src/notification/notification.service';
@Injectable()
export class AdminService {
  constructor(
    private readonly model: DbService,
    private readonly jwtService: JwtService,
    private readonly adminAggregation: AdminAggregation,
    private readonly commonService: CommonService,
    private readonly notification: NotificationService,
    private readonly emailService: EmailService,
    private readonly earningService: EarningService,
    private readonly paymentService: PaymentService,
  ) { }

  async login(signInDto: SignInDto) {
    try {
      const validIP = await this.model.ipaddress.findOne({
        address: signInDto.ipAddress,
      });

      // if (!validIP) {
      //   throw new HttpException(
      //     {
      //       error_code: 'INVALID_CREDENTIALS',
      //       error_description: 'Unauthorized IP address'
      //     },
      //     HttpStatus.UNAUTHORIZED,
      //   );
      // }

      const fetch_admin = await this.model.admin.findOne({
        email: String(signInDto.email).toLowerCase(),
      }).lean(true);
      if (!fetch_admin) {
        throw new HttpException(
          {
            error_code: 'INVALID_CREDENTIALS',
            error_description: 'Incorrect email or password'
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (signInDto.type === StaffRoles.dispatcher && fetch_admin?.superAdmin) {
        throw new HttpException(
          {
            error_code: 'ACCESS_DENIED',
            error_description:
              'You have no permission to access this resource',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // if (!fetch_admin.superAdmin && !fetch_admin.roles.includes(signInDto.type)) {
      //   throw new HttpException(
      //     {
      //       error_code: 'ACCESS_DENIED',
      //       error_description:
      //         'You have no permission to access this resource',
      //     },
      //     HttpStatus.BAD_REQUEST,
      //   );
      // }


      /*if (fetch_admin.is_deleted) {
        throw new HttpException(
          {
            error_code: 'Your account is deleted.Please contact Admin',
            error_description:
              'Your account is deleted.Please contact Admin',
          },
          HttpStatus.BAD_REQUEST,
        );
      }*/

      if (!fetch_admin.is_active) {
        throw new HttpException(
          {
            error_code: 'Your account is deactivated.Please contact Admin',
            error_description:
              'Your account is deactivated.Please contact Admin',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const isPasswordValid = await bcrypt.compare(
        signInDto.password,
        fetch_admin.password,
      );
      if (!isPasswordValid) {
        throw new HttpException(
          {
            error_code: 'INVALID_CREDENTIALS',
            error_description: 'Incorrect email or password'
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      const payload = { user_id: fetch_admin._id, scope: fetch_admin.superAdmin ? UsersType.admin : UsersType.Staff };
      const access_token = await this.jwtService.signAsync(payload);
      // await this.model.sessions.deleteMany({ user_id: fetch_admin._id });
      await this.model.sessions.create({
        user_id: fetch_admin._id,
        token: access_token,
        scope: payload.scope,
        fcm_token: signInDto.fcm_token
      });
      const unread_count = await this.model.chats.aggregate([
        {
          $lookup: {
            from: "connections",
            localField: "connection_id",
            foreignField: "_id",
            as: "connection_id"
          }
        },
        {
          $unwind: {
            path: "$connection_id",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            $or: [
              {
                receiver: fetch_admin?._id
              },
              { receiver: null }
            ],
            is_deleted: false,
            read: false,
            "connection_id.is_exit_chat": false
          }
        },
        {
          $count: "unread_count"
        }
      ])
      return {
        token: access_token,
        data: { ...fetch_admin, unread_count: unread_count[0]?.unread_count ?? 0 },
      };


    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async get_admin_profile(payload) {
    try {
      const data = await this.model.admin.findById({ _id: payload.user_id }, {}, { lean: true });
      const unread_count = await this.model.chats.aggregate([
        {
          $lookup: {
            from: "connections",
            localField: "connection_id",
            foreignField: "_id",
            as: "connection_id"
          }
        },
        {
          $unwind: {
            path: "$connection_id",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            $or: [
              {
                receiver: data?._id
              },
              { receiver: null }
            ],
            is_deleted: false,
            read: false,
            "connection_id.is_exit_chat": false
          }
        },
        {
          $count: "unread_count"
        }
      ])
      return { data: { ...data, unread_count: unread_count[0]?.unread_count ?? 0 } };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async bootstrap_for_created_admin() {
    const email = 'admin@gmail.com';

    let fetch_data: any = await this.model.admin.findOne({ email: email });

    if (!fetch_data) {
      Logger.log('admin created');
      let default_password = 'Admin@#123';
      let password = await bcrypt.hash(default_password, 10);
      let saveData = {
        name: 'super admin',
        image: null,
        email: 'admin@gmail.com',
        password: password,
        roles: [],
        superAdmin: true,
      };
      let data = await this.model.admin.create(saveData);

      console.log('d', data);
    }
  }

  async sent_notification(body: NotificationDto) {
    try {
      let emails = [];
      let data_to_aggregate = [];
      //sent notification to all customer
      if (body.send_notification_to === 'customer') {
        data_to_aggregate = [
          await this.adminAggregation.match(),
          await this.adminAggregation.SessionLookup(),
          await this.adminAggregation.project(),
        ];
        let data: any = await this.model.customers.aggregate(data_to_aggregate);
        console.log('data', data);
        if (body.send_notification_via === 'email') {
          this.emailService.notifyByAdmin(data, body.title, body.description)
          // await this.sent_email(data, body.title, body.description);
        } else {
          await this.sent_push(data, body.title, body.description);
        }
      }
      //sent notification to selected customer
      else if (body.send_notification_to === 'selected_customer') {
        console.log('dd', body.selected_ids);
        data_to_aggregate = [
          await this.adminAggregation.selectedmatch(body.selected_ids),
          await this.adminAggregation.SessionLookup(),
          await this.adminAggregation.project(),
        ];
        let data: any = await this.model.customers.aggregate(data_to_aggregate);
        console.log('data', data);
        if (body.send_notification_via === 'email') {
          this.emailService.notifyByAdmin(data, body.title, body.description);
          // await this.sent_email(data, body.title, body.description);
        } else {
          await this.sent_push(data, body.title, body.description);
        }
      }
      //sent notification to all drivers
      else if (body.send_notification_to === 'driver') {
        data_to_aggregate = [
          await this.adminAggregation.drivermatch(),
          await this.adminAggregation.SessionLookup(),
          await this.adminAggregation.project(),
        ];
        let data: any = await this.model.drivers.aggregate(data_to_aggregate);
        console.log('data', data);
        if (body.send_notification_via === 'email') {
          await this.emailService.notifyByAdmin(data, body.title, body.description);
          // await this.sent_email(data, body.title, body.description);
        } else {
          await this.sent_push(data, body.title, body.description);
        }
      }
      //sent notification to selected driver
      else if (body.send_notification_to === 'selected_driver') {
        console.log('dd', body.selected_ids);
        data_to_aggregate = [
          await this.adminAggregation.selectedmatch(body.selected_ids),
          await this.adminAggregation.SessionLookup(),
          await this.adminAggregation.project(),
        ];
        let data: any = await this.model.drivers.aggregate(data_to_aggregate);
        console.log('data', data);
        if (body.send_notification_via === 'email') {
          await this.emailService.notifyByAdmin(data, body.title, body.description);
          // await this.sent_email(data, body.title, body.description);
        } else {
          await this.sent_push(data, body.title, body.description);
        }
      }
      return { message: "Notification sent successfully" }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  // async sent_email(data, title, description) {
  //   try {
  //     const currentDir = __dirname;
  //     const cabAppDir = path.resolve(currentDir, '../../');
  //     console.log('hello', cabAppDir);

  //     let file_path = path.join(
  //       __dirname,
  //       '../../dist/email-template/cloud-notification.hbs',
  //     );

  //     console.log('file_path', file_path);
  //     let html = fs.readFileSync(file_path, { encoding: 'utf-8' });

  //     // Compile the template

  //     const template = Handlebars.compile(html);
  //     const email_data = {
  //       description: description,
  //     };
  //     const htmlToSend = template(email_data);

  //     let i = 0;
  //     for (const email of data) {
  //       console.log('emails', data[i].email);
  //       console.log('emails', data[i].email);

  //       let mail_data = {
  //         to: data[i].email,
  //         subject: title,
  //         html: htmlToSend,
  //       };
  //       this.commonService.sendmail(
  //         mail_data.to,
  //         mail_data.subject,
  //         null,
  //         mail_data.html,
  //       );
  //       i++;
  //     }
  //   } catch (error) {
  //     console.log('error', error);
  //     throw error;
  //   }
  // }

  async sent_push(data, title, description) {
    try {
      for (const customer of data) {
        if (customer.sessions && customer.sessions.length > 0) {
          const fcm_token = customer.sessions[0].fcm_token;
          let pushData = {
            title: title,
            message: description,
          };
          let data_push = {
            type: 'admin_push',
          };
          console.log('ff', fcm_token);
          try {

            this.notification.send_notification(pushData, fcm_token, data_push);
          } catch (error) {
            console.log('notification failed ---->', error);

          }
        } else {
          console.warn(
            `Skipping customer ${customer.email} due to empty or missing sessions.`,
          );
        }
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  async dashboard_count() {
    try {
      //<<<<<<<<<<<<<<BOOKING COUNT>>>>>>>>>>>>>>>>>>>
      let booking_data_to_aggregate = [
        await this.adminAggregation.bookingoverallmatch(),
      ];
      let TodayBooking_data_to_aggregate = [
        await this.adminAggregation.bookingTodaymatch(),
      ];
      let MonthlyBooking_data_to_aggregate = [
        await this.adminAggregation.bookingMonthmatch(),
      ];
      let WeeklyBooking_data_to_aggregate = [
        await this.adminAggregation.bookingWeekmatch(),
      ];

      const OverallBooking = await this.model.booking.aggregate(
        booking_data_to_aggregate,
      );
      const TodayBooking = await this.model.booking.aggregate(
        TodayBooking_data_to_aggregate,
      );
      const MonthlyBooking = await this.model.booking.aggregate(
        MonthlyBooking_data_to_aggregate,
      );
      const WeeklyBooking = await this.model.booking.aggregate(
        WeeklyBooking_data_to_aggregate,
      );

      //<<<<<<<<<<<<<<CUSTOMERS COUNT>>>>>>>>>>>>>>>>>>>
      let customer_data_to_aggregate = [
        await this.adminAggregation.Customersoverallmatch(),
      ];

      let CustomerTodaymatch_data_to_aggregate = [
        await this.adminAggregation.CustomerTodaymatch(),
      ];
      let CustomerWeekmatch_to_aggregate = [
        await this.adminAggregation.CustomerWeekmatch(),
      ];
      let CustomerMonthmatch_data_to_aggregate = [
        await this.adminAggregation.CustomerMonthmatch(),
      ];

      const OverallCustomer = await this.model.customers.aggregate(
        customer_data_to_aggregate,
      );
      const TodayCustomer = await this.model.customers.aggregate(
        CustomerTodaymatch_data_to_aggregate,
      );
      const WeeklyCustomer = await this.model.customers.aggregate(
        CustomerWeekmatch_to_aggregate,
      );
      const MOnthlyCustomer = await this.model.customers.aggregate(
        CustomerMonthmatch_data_to_aggregate,
      );

      let driver_data_to_aggregate = [
        await this.adminAggregation.Driversoverallmatch(),
      ];
      let DriverIdle = [
        await this.adminAggregation.DriverIdleMatch(),
      ];
      let DriverOnRide = [
        await this.adminAggregation.DriverOnRideMatch(),
      ];
      let DriverOffline = [
        await this.adminAggregation.DriverOfflineMatch(),
      ];
      const Overalldriver = await this.model.drivers.aggregate(
        driver_data_to_aggregate,
      );
      const Idledriver = await this.model.drivers.aggregate(
        DriverIdle,
      );
      const OnRidedriver = await this.model.drivers.aggregate(
        DriverOnRide,
      );
      const Offlinedriver = await this.model.drivers.aggregate(
        DriverOffline,
      );

      let driverRequest_data_to_aggregate = [
        await this.adminAggregation.DriverRequestsOverallMatch(),
      ];
      let TodaydriverRequest_data_to_aggregate = [
        await this.adminAggregation.DriverRequestTodaymatch(),
      ];
      let WeeklyDriverRequest_data_to_aggregate = [
        await this.adminAggregation.DriverRequestWeekmatch(),
      ];
      let MonthlyDriverRequest_data_to_aggregate = [
        await this.adminAggregation.DriverRequestMonthMatch(),
      ];
      const driverRequestOverall = await this.model.drivers.aggregate(
        driverRequest_data_to_aggregate,
      );
      const driverRequestMontly = await this.model.drivers.aggregate(
        MonthlyDriverRequest_data_to_aggregate,
      );
      const driverRequestWeekly = await this.model.drivers.aggregate(
        WeeklyDriverRequest_data_to_aggregate,
      );
      const driverRequestToday = await this.model.drivers.aggregate(
        TodaydriverRequest_data_to_aggregate,
      );

      let docsUpdateRequest_data_to_aggregate = [
        await this.adminAggregation.Docs_update_request_overallmatch(),
      ];
      let TodaydocsUpdateRequest_data_to_aggregate = [
        await this.adminAggregation.Today_Docs_Updated_RequestTodaymatch(),
      ];
      let WeekdocsUpdateRequest_data_to_aggregate = [
        await this.adminAggregation.Docs_update_RequestWeekmatch(),
      ];
      let MontlydocsUpdateRequest_data_to_aggregate = [
        await this.adminAggregation.Monthly_Docs_Updated_RequestMatch(),
      ];
      const docsUpdateRequest = await this.model.drivers.aggregate(
        docsUpdateRequest_data_to_aggregate,
      );
      const TodaydocsUpdateRequest = await this.model.drivers.aggregate(
        TodaydocsUpdateRequest_data_to_aggregate,
      );

      const WeekdocsUpdateRequest = await this.model.drivers.aggregate(
        WeekdocsUpdateRequest_data_to_aggregate,
      );

      const MontlydocsUpdateRequest = await this.model.drivers.aggregate(
        MontlydocsUpdateRequest_data_to_aggregate,
      );

      let overallearning_data_to_aggregate = [
        await this.adminAggregation.Earningsoverallmatch(),
        await this.adminAggregation.face_set(),
      ];

      let todayearning_data_to_aggregate = [
        await this.adminAggregation.TodayEarningMatch(),
        await this.adminAggregation.face_set(),
      ];

      let weekearning_data_to_aggregate = [
        await this.adminAggregation.weekEarningsoverallmatch(),
        await this.adminAggregation.face_set(),
      ];

      let montlyearning_data_to_aggregate = [
        await this.adminAggregation.monthlyEarningsoverallmatch(),
        await this.adminAggregation.face_set(),
      ];

      const overallearning = await this.model.payments.aggregate(
        overallearning_data_to_aggregate,
      );

      const todayearning = await this.model.payments.aggregate(
        todayearning_data_to_aggregate,
      );

      const weeklyearning = await this.model.payments.aggregate(
        weekearning_data_to_aggregate,
      );

      const monthlyearning = await this.model.payments.aggregate(
        montlyearning_data_to_aggregate,
      );

      let Pending_complaint_data_to_aggregate = [
        await this.adminAggregation.PendingComplaintmatch(),
      ];
      let Replied_complaint_data_to_aggregate = [
        await this.adminAggregation.RepliedComplaintmatch(),
      ];
      const Pendingcomplaints = await this.model.complaints.aggregate(
        Pending_complaint_data_to_aggregate,
      );
      const repliedcomplaints = await this.model.complaints.aggregate(
        Replied_complaint_data_to_aggregate,
      );

      //   //MONTLY TAX DUE TO GOVT
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthmili = startOfMonth.getTime();

      const startOfYear = new Date(today.getFullYear(), 0, 1); // January 1st of the current year
      startOfYear.setHours(0, 0, 0, 0); // Set to the start of the day
      const startOfYearMili = startOfYear.getTime(); // Start of the year in milliseconds
      const todayMili = today.getTime(); // Current date and time in milliseconds



      let monthlyTax = 0;
      let yearlyTax = 0;
      let overallTax = 0;
      let monthBookings = await this.model.booking.find({
        created_at: { $gte: startOfMonthmili },
      });
      let yearlyBookings = await this.model.booking.find({
        created_at: { $gte: startOfYearMili, $lte: todayMili },
      });
      let overallBookings = await this.model.booking.find();

      for (const monthly of monthBookings) {
        monthlyTax += monthly.gst;
      }
      for (const yearly of yearlyBookings) {
        yearlyTax += yearly.gst;
      }
      for (const overall of overallBookings) {
        overallTax += overall.gst;
      }

      const startOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay()),
      );
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekMillis = startOfWeek.getTime();
      let totalDueToAppYear = 0;
      let totalDueToAppmonth = 0;
      let totalDueToAppweek = 0;
      let totalDueToAppYearOnline = 0;
      let totalDueToAppmonthOnline = 0;
      let totalDueToAppweekOnline = 0;
      let DueToAppYear = 0;
      let DueToAppmonth = 0;
      let DueToAppweek = 0;
      let totalDueToAppOverallOnline = 0;
      let totalDueToAppOverall = 0;
      let DueToAppoverall = 0;

      const year_payment = await this.model.payments.find({
        payout_to_driver: 'pending',

        created_at: { $gte: startOfYearMili, $lte: todayMili },
      });
      const month_payment = await this.model.payments.find({
        payout_to_driver: 'pending',
        created_at: { $gte: startOfMonthmili },
      });
      const week_payment = await this.model.payments.find({
        payout_to_driver: 'pending',
        created_at: { $gte: startOfWeekMillis },
      });
      const overall_payment = await this.model.payments.find({
        payout_to_driver: 'pending',
      });
      const year_payment_online = await this.model.payments.find({
        created_at: { $gte: startOfYearMili, $lte: todayMili },
      });
      const month_payment_online = await this.model.payments.find({
        created_at: { $gte: startOfMonthmili },
      });
      const week_payment_online = await this.model.payments.find({
        created_at: { $gte: startOfWeekMillis },
      });
      const overall_payment_online = await this.model.payments.find();

      //IN OVERALL
      for (const overall of overall_payment) {
        let booking = await this.model.booking.findOne({
          _id: overall.booking_id,
        });
        DueToAppoverall += overall.commision_amount + booking?.gst || 0;
      }
      //IN YEAR
      for (const year of year_payment) {
        let booking = await this.model.booking.findOne({
          _id: year.booking_id,
        });
        DueToAppYear += year.commision_amount + booking?.gst || 0;
      }

      //IN MONTH
      for (const month of month_payment) {
        let booking = await this.model.booking.findOne({
          _id: month.booking_id,
        });
        DueToAppmonth += month.commision_amount + booking?.gst || 0;
      }
      //IN WEEK
      for (const week of week_payment) {
        let booking = await this.model.booking.findOne({
          _id: week.booking_id,
        });
        DueToAppweek += week.commision_amount + booking?.gst || 0;
      }
      // for (const week_online of week_payment_online) {
      //   totalDueToAppweekOnline += week_online.payout_amount;
      // }

      // DueToAppweek = totalDueToAppweek - totalDueToAppweekOnline;
      // if (DueToAppweek < 0) {
      //   DueToAppweek = 0;
      // }

      return {
        OverallBooking: OverallBooking.length,
        TodayBooking: TodayBooking.length,
        MonthlyBooking: MonthlyBooking.length,
        WeeklyBooking: WeeklyBooking.length,
        OverallCustomer: OverallCustomer.length,
        TodayCustomer: TodayCustomer.length,
        WeeklyCustomer: WeeklyCustomer.length,
        MonthlyCustomer: MOnthlyCustomer.length,
        Overalldriver: Overalldriver.length,
        Idledriver: Idledriver.length,
        OnRidedriver: OnRidedriver.length,
        Offlinedriver: Offlinedriver.length,
        driverRequestOverall: driverRequestOverall.length,
        driverRequestMontly: driverRequestMontly.length,
        driverRequestWeekly: driverRequestWeekly.length,
        docsUpdateRequest: docsUpdateRequest.length,
        TodaydocsUpdateRequest: TodaydocsUpdateRequest.length,
        WeekdocsUpdateRequest: WeekdocsUpdateRequest.length,
        MontlydocsUpdateRequest: MontlydocsUpdateRequest.length,
        driverRequestToday: driverRequestToday.length,

        overallEarning: parseFloat(
          overallearning[0]?.total_earning[0]?.total_earning.toFixed(2),
        ),
        todayEarning: parseFloat(
          todayearning[0]?.total_earning[0]?.total_earning.toFixed(2),
        ),
        weeklyEarning: parseFloat(
          weeklyearning[0]?.total_earning[0]?.total_earning.toFixed(2),
        ),
        monthlyEarning: parseFloat(
          monthlyearning[0]?.total_earning[0]?.total_earning.toFixed(2),
        ),

        Pendingcomplaints: Pendingcomplaints.length,
        repliedcomplaints: repliedcomplaints.length,
        due_to_app_month: parseFloat(DueToAppmonth.toFixed(2)),
        due_to_app_week: parseFloat(DueToAppweek.toFixed(2)),
        due_to_app_year: parseFloat(DueToAppYear.toFixed(2)),
        overall_payout_due: parseFloat(DueToAppoverall.toFixed(2)),
        montly_tax: parseFloat(monthlyTax.toFixed(2)),
        year_tax: parseFloat(yearlyTax.toFixed(2)),
        overall_tax: parseFloat(overallTax.toFixed(2)),
      };
    } catch (error) {
      throw error;
    }
  }

  async AdminChangePassword(body, id: string) {
    try {
      const data = await this.model.admin.findOne({ _id: id });
      const is_password_valid = await bcrypt.compare(
        body.current_password,
        data.password,
      );
      if (is_password_valid) {
        let password = await bcrypt.hash(body.new_password, 10);
        const update_password = await this.model.admin.updateOne(
          { _id: id },
          { password: password },
        );
        return { message: 'Password update successfully' };
      } else {
        throw new HttpException(
          {
            error_code: 'Incorrect current password',
            error_description: 'Incorrect current password',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async AdminPayout() {
    try {
      const tax = await this.model.booking.aggregate([
        {
          $match: {
            booking_status: BookingStatus.Completed,
          }
        }, {
          $group: {
            _id: null,
            total_tax: { $sum: "$gst" }
          }
        }
      ])
      // let overall_due_to_app = 0;
      // let overall_due_to_driver = 0;
      // let tax_to_be_paid = 0;
      // let total_balance_in_stripe = 0;
      // let pending_submit_cash = 0;
      // let PayTax = 0;
      // let TotalCollectTax = 0;
      // let cash_payment = 0;
      // let payout_amount = 0;
      // const pending_cash_amount = await this.model.payments.find({
      //   payment_type: 'cash',
      //   payout_to_driver: 'pending',
      // });
      // console.log('pending_cash_amount,', pending_cash_amount.length);

      const pending_payout_amount = await this.model.payments.aggregate([
        {
          $match: { payout_to_driver: 'pending' }
        },
        {
          $group: {
            _id: null,
            payout_amount: { $sum: "$payout_amount" }
          }
        }
      ]);
      const total_balance_in_stripe = await this.paymentService.checkStripeBalance();
      // let totalDueToapp = 0;
      // for (const cash of pending_cash_amount) {
      //   // console.log('cash', cash.amount);
      //   const booking = await this.model.booking.findOne({
      //     _id: cash.booking_id,
      //   });

      //   totalDueToapp = totalDueToapp + cash.commision_amount + booking.gst;
      //   console.log('total', totalDueToapp);

      //   //  totalDueToapp = cash_payment + booking.gst;
      // }
      // for (const payout of pending_payout_amount) {
      //   payout_amount += parseFloat(payout.payout_amount.toFixed(2));
      // }
      // overall_due_to_app = parseFloat(totalDueToapp.toFixed(2));

      // const pending_payment = await this.model.payments.find({
      //   payment_type: 'card',
      //   payout_to_driver: 'pending',
      // });
      // for (const pending of pending_payment) {
      //   // console.log('pending', pending.amount);
      //   const booking = await this.model.booking.findOne({
      //     _id: pending.booking_id,
      //   });

      //   overall_due_to_driver += parseFloat(
      //     (pending.amount - pending.commision_amount - booking?.gst).toFixed(2),
      //   );
      // }
      // overall_due_to_driver = parseFloat(overall_due_to_driver.toFixed(2));

      // const all_booking = await this.model.booking.find({
      //   booking_status: { $nin: [null, 'cancelled', 'failed'] },
      // });
      // const pay_tax = await this.model.tax.find();

      // for (const totaltax of pay_tax) {
      //   PayTax += parseFloat(totaltax.amount.toFixed(2));
      // }
      // // console.log('pay.....tax...', PayTax);

      // for (const tax of all_booking) {
      //   TotalCollectTax += parseFloat(tax.gst.toFixed(2));
      // }
      // // console.log('TotalCollectTax.....tax...', TotalCollectTax);
      // tax_to_be_paid = parseFloat((TotalCollectTax - PayTax).toFixed(2));

      // // console.log('total_balance_in_stripe', total_balance_in_stripe);

      // const weeklyData = {};
      // let payment = await this.model.payments.find();

      // // Get the first payment date to start from the earliest week
      // const firstPaymentDate =
      //   payment.length > 0 ? new Date(payment[0].created_at) : new Date();
      // const firstDayOfWeek = new Date(firstPaymentDate);
      // firstDayOfWeek.setDate(
      //   firstPaymentDate.getDate() - firstPaymentDate.getDay(),
      // );
      // firstDayOfWeek.setHours(0, 0, 0, 0);

      // // Get the current date to ensure all weeks until the present are included
      // const currentDate = new Date();
      // const currentDayOfWeek = currentDate.getDay();
      // const lastDayOfWeek = new Date(currentDate);
      // lastDayOfWeek.setDate(currentDate.getDate() + (6 - currentDayOfWeek));
      // lastDayOfWeek.setHours(23, 59, 59, 999);

      // let startOfWeek = firstDayOfWeek;
      // let endOfWeek = new Date(startOfWeek);
      // endOfWeek.setDate(startOfWeek.getDate() + 6);
      // endOfWeek.setHours(23, 59, 59, 999);

      // while (startOfWeek <= lastDayOfWeek) {
      //   const weekKey = `${startOfWeek.toISOString()} to ${endOfWeek.toISOString()}`;

      //   weeklyData[weekKey] = {
      //     total_ride_amount: 0,
      //     total_rides: 0,
      //     total_tax_amount: 0,
      //     online_paid_amount: 0,
      //     cash_paid_amount: 0,
      //     payment_due_to_driver: 0,
      //     payment_due_to_app: 0,
      //   };

      //   startOfWeek = new Date(endOfWeek);
      //   startOfWeek.setDate(startOfWeek.getDate() + 1);
      //   startOfWeek.setHours(0, 0, 0, 0);

      //   endOfWeek = new Date(startOfWeek);
      //   endOfWeek.setDate(startOfWeek.getDate() + 6);
      //   endOfWeek.setHours(23, 59, 59, 999);
      // }

      // // Loop through the payment data
      // // console.log("payment...", payment);
      // let payment_amount = 0;
      // for (let data of payment) {
      //   const booking = await this.model.booking.findOne({
      //     _id: data.booking_id,
      //   });

      //   if (!booking) {
      //     // console.log('Booking not found for booking_id:', data.booking_id);
      //     continue; // Skip if booking is not found
      //   }

      //   // Fetch all payments related to the booking
      //   const online_paid = await this.model.payments.find({
      //     booking_id: data.booking_id,
      //     payment_type: { $ne: 'cash' },
      //   });

      //   const offline_paid = await this.model.payments.find({
      //     booking_id: data.booking_id,
      //     payment_type: 'cash',
      //   });

      //   const due_to_driver = await this.model.payments.find({
      //     booking_id: data.booking_id,
      //     payment_type: { $ne: 'cash' },
      //     payout_to_driver: 'pending',
      //   });

      //   const paid_payments = await this.model.payments.find({
      //     booking_id: data.booking_id,
      //     payment_type: { $ne: 'cash' },
      //   });

      //   const due_to_app = await this.model.payments.find({
      //     booking_id: data.booking_id,
      //     payment_type: 'cash',
      //     pending_amount_pay_on: null,
      //   });

      //   // Calculate the week starting from Sunday
      //   const createdAt = new Date(data.created_at);
      //   const dayOfWeek = createdAt.getDay();
      //   const startOfWeek = new Date(createdAt);
      //   startOfWeek.setDate(createdAt.getDate() - dayOfWeek);
      //   startOfWeek.setHours(0, 0, 0, 0);

      //   const endOfWeek = new Date(startOfWeek);
      //   endOfWeek.setDate(startOfWeek.getDate() + 6);
      //   endOfWeek.setHours(23, 59, 59, 999);

      //   const weekKey = `${startOfWeek.toISOString()} to ${endOfWeek.toISOString()}`;

      //   if (!weeklyData[weekKey]) {
      //     weeklyData[weekKey] = {
      //       total_ride_amount: 0,
      //       total_rides: 0,
      //       total_tax_amount: 0,
      //       online_paid_amount: 0,
      //       cash_paid_amount: 0,
      //       payment_due_to_driver: 0,
      //       payment_due_to_app: 0,
      //     };
      //   }

      //   // Aggregate amounts
      //   const total_due_to_driver =
      //     parseFloat(
      //       due_to_driver
      //         .reduce((sum, payment) => sum + (payment.payout_amount || 0), 0)
      //         .toFixed(2),
      //     ) || 0;

      //   const total_due_to_app =
      //     parseFloat(
      //       due_to_app
      //         .reduce((sum, payment) => sum + (payment.amount || 0), 0)
      //         .toFixed(2),
      //     ) || 0;

      //   // console.log('pay...,.,.,.,.', payment_amount);

      //   // pending_submit_cash = parseFloat(
      //   //   (total_due_to_app - total_due_to_driver).toFixed(2),
      //   // );

      //   weeklyData[weekKey].total_ride_amount += booking.total_amount || 0;
      //   weeklyData[weekKey].total_rides += 1;
      //   weeklyData[weekKey].total_tax_amount += booking.gst || 0;
      //   weeklyData[weekKey].online_paid_amount += online_paid.reduce(
      //     (sum, payment) => sum + (payment.amount || 0),
      //     0,
      //   );
      //   weeklyData[weekKey].cash_paid_amount += offline_paid.reduce(
      //     (sum, payment) => sum + (payment.amount || 0),
      //     0,
      //   );
      //   weeklyData[weekKey].payment_due_to_driver += total_due_to_driver;
      //   // weeklyData[weekKey].payment_due_to_app += pending_submit_cash;
      // }

      // let total_payout_amount = 0;
      // let total_cash_amount = 0;
      // let check_due_to_app = 0;

      // // Format the response
      // const formattedData = [];
      // for (let weekKey in weeklyData) {
      //   // Reset these variables for each week
      //   let total_cash_amount = 0;
      //   let total_payout_amount = 0;

      //   const [startOfWeek, endOfWeek] = weekKey.split(' to ');
      //   const startOfWeekDate = new Date(startOfWeek);
      //   const endOfWeekDate = new Date(endOfWeek);

      //   // console.log('start', startOfWeekDate.valueOf());
      //   // console.log('endOfWeekDate', endOfWeekDate.valueOf());

      //   const pending_payment = await this.model.payments.find({
      //     created_at: {
      //       $gte: startOfWeekDate.valueOf(),
      //       $lte: endOfWeekDate.valueOf(),
      //     },
      //     payment_type: 'card',
      //     payout_to_driver: 'pending',
      //   });
      //   let check_due_to_driver = 0
      //   for (const pending of pending_payment) {
      //     // console.log('pending', pending.amount);
      //     const booking = await this.model.booking.findOne({
      //       _id: pending.booking_id,
      //     });

      //     check_due_to_driver += parseFloat(
      //       (pending.amount - pending.commision_amount - booking.gst).toFixed(2),
      //     );
      //   }
      //   check_due_to_driver = parseFloat(check_due_to_driver.toFixed(2));

      //   const offline_paid = await this.model.payments.find({
      //     created_at: {
      //       $gte: startOfWeekDate.valueOf(),
      //       $lte: endOfWeekDate.valueOf(),
      //     },
      //     payout_to_driver: "pending",
      //     payment_type: 'cash',
      //   });

      //   // console.log('check data..,..,,.,', online_paid);
      //   // console.log('check data..,..,,.,offline_paid', offline_paid);

      //   // Accumulate the amounts for this week
      //   // for (const total_online_paid of online_paid) {
      //   //   total_payout_amount += total_online_paid.payout_amount;
      //   // }

      //   for (const total_offline_paid of offline_paid) {
      //     let booking = await this.model.booking.findOne({ _id: total_offline_paid.booking_id })
      //     total_cash_amount += total_offline_paid.commision_amount + booking.gst;
      //   }

      //   // Calculate the due to app amount for this week
      //   let check_due_to_app = 0;
      //   check_due_to_app = parseFloat(total_cash_amount.toFixed(2))


      //   // console.log('checkduetoapp', check_due_to_app);

      //   // Push the data for this week
      //   formattedData.push({
      //     week_start: startOfWeekDate.getTime(),
      //     week_end: endOfWeekDate.getTime(),
      //     total_ride_amount: parseFloat(
      //       weeklyData[weekKey].total_ride_amount.toFixed(2),
      //     ),
      //     total_rides: weeklyData[weekKey].total_rides,
      //     total_tax_amount: parseFloat(
      //       weeklyData[weekKey].total_tax_amount.toFixed(2),
      //     ),
      //     online_paid: parseFloat(
      //       weeklyData[weekKey].online_paid_amount.toFixed(2),
      //     ),
      //     cash_paid: parseFloat(
      //       weeklyData[weekKey].cash_paid_amount.toFixed(2),
      //     ),
      //     payment_due_to_driver: parseFloat(check_due_to_driver.toFixed(2)),

      //     payment_due_to_app: parseFloat(check_due_to_app.toFixed(2)), // Ensure this is a number with 2 decimal places
      //   });
      // }

      // formattedData.sort((a, b) => b.week_start - a.week_start);

      return {
        total_due_to_app: 0,
        total_due_to_driver: pending_payout_amount[0]?.payout_amount ?? 0,
        total_tax_to_be_paid: tax[0]?.total_tax ?? 0,
        total_balance_in_stripe: total_balance_in_stripe ?? 0,
        // week_data: formattedData,
      };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async UpdateTax(body, admin_id) {
    try {
      const currentDate = moment().format('DD/MM/YYYY'); // Date in DD/MM/YYYY format
      const currentTime = moment()
        .add(5, 'hours')
        .add(30, 'minutes')
        .format('hh:mm A'); // Time in 12-hour format with AM/PM

      const admin = await this.model.admin.findOne({ _id: admin_id });
      const currentTotalTaxPay = Number(admin.total_tax_pay);

      // Ensure that body.amount is a number
      const amountToAdd = Number(body.amount);

      // Calculate the new total amount
      const total_amount = currentTotalTaxPay + amountToAdd;
      const update = await this.model.admin.updateOne(
        { _id: admin_id },
        { total_tax_pay: total_amount },
      );
      const create = await this.model.tax.create({
        date: currentDate,
        time: currentTime,
        amount: body.amount,
        created_at: moment().add(5, 'hours').add(30, 'minutes'),
      });
      return { message: 'Tax update successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async TaxTransactionHistory(page, limit) {
    try {
      const skip = (page - 1) * limit;
      const data = await this.model.tax.find().skip(skip).limit(limit);
      return {
        data: data,
      };
    } catch (error) {
      throw error;
    }
  }

  async total_tax_amount(admin_id) {
    try {
      let total_tax_collected = 0;
      let total_tax_paid = 0;
      let PayTax = 0;
      // Fetch all bookings and calculate total tax collected
      const bookings = await this.model.booking.find({
        booking_status: { $nin: [null, 'cancelled', 'failed'] },
      });
      for (const booking of bookings) {
        total_tax_collected += booking.gst;
      }

      // Fetch the admin details
      const pay_tax = await this.model.tax.find();

      for (const totaltax of pay_tax) {
        PayTax += parseFloat(totaltax.amount.toFixed(2));
      }
      console.log('pay.....tax...', PayTax);

      // Calculate the total tax to be paid
      total_tax_paid = PayTax;
      const total_tax_to_be_paid = total_tax_collected - total_tax_paid;

      // Prepare the response
      return {
        total_tax_collected: total_tax_collected.toFixed(2),
        total_tax_paid: total_tax_paid.toFixed(2),
        total_tax_to_be_paid: total_tax_to_be_paid.toFixed(2),
      };
    } catch (error) {
      throw error;
    }
  }

  //   async PayToDriverList(){
  //     try {
  //       let data
  //       let amount
  //       let payment=await this.model.payments.find({payout_to_driver:"pending",payment_type:{$ne:"cash"}})
  //       for(const PaymentData of payment){
  //         let driver=await this.model.drivers.findOne({_id:PaymentData.driver_id})
  // amount =PaymentData.amount-PaymentData.commision_amount
  // data.push({
  //   driver_name:driver.name,
  //   amount:amount,
  //   total_booking:
  // })
  //       }
  //     } catch (error) {
  //       console.log("error",error);
  //       throw error;

  //     }
  //   }

  async PayToAppList(page, limit) {
    try {
      const data = [];
      let status;
      const skip = (page - 1) * limit;
      let total_amount = 0;
      // Fetch payment data with pagination
      const paymentData = await this.model.payments
        .find({
          payout_to_driver: 'pending',
          payment_type: 'cash',
        })
        .skip(skip)
        .limit(limit);

      console.log('paymentData.length', paymentData.length);

      const driverPayments = {};

      // Group payments by driver_id
      for (const payment of paymentData) {
        const driverId = payment.driver_id;

        const booking = await this.model.booking.findOne({
          _id: payment.booking_id,
        });
        // console.log('booking', payment.booking_id);

        if (!driverPayments[driverId]) {
          driverPayments[driverId] = {
            totalAmount: 0,
            bookingCount: 0,
            driver: null,
          };
        }
        driverPayments[driverId].totalAmount = parseFloat(
          (
            driverPayments[driverId].totalAmount +
            payment.commision_amount +
            booking.gst
          ).toFixed(2),
        );

        driverPayments[driverId].bookingCount += 1;
      }

      // Fetch driver details and prepare the final data array
      for (const driverId in driverPayments) {
        const driver = await this.model.drivers
          .findOne({ _id: driverId })
          .sort({ created_at: -1 });

        driverPayments[driverId].driver = driver;
        if (
          driver.is_active === true &&
          driver.is_block === false
        ) {
          status = 'Active';
        } else if (driver.is_block === true) {
          status = 'Blocked';
        } else if (driver.is_deleted === true) {
          status = 'Deleted';
        }

        data.push({
          driver_name: driver.name,
          driver_email: driver.email,
          driver_id: driver._id,
          amount: driverPayments[driverId].totalAmount,
          total_booking: driverPayments[driverId].bookingCount,
          status: status,
        });
      }

      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async freeDrivers() {
    try {
      const update = await this.model.drivers.updateMany(
        { is_deleted: false },
        {
          $set: {
            ride_status: "free",
            currently_send_ride_request: false,
            currently_send_ride_request_id: null,
            current_booking: null
          }
        }
      )

      return update;
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async AdminPayoutExport(body) {
    try {
      let formattedData = [];

      // Fetch all payment records within the date range
      const payments = await this.model.payments.find({
        created_at: { $gte: body.start_date, $lte: body.end_date },
      });

      // Get unique driver IDs from the payment records
      const uniqueDriverIds = Array.from(new Set(payments.map((p) => p.driver_id)));

      // Fetch driver details for each unique driver
      const drivers = await this.model.drivers.find({ _id: { $in: uniqueDriverIds } });

      // Iterate over each driver and calculate their stats
      for (const driver of drivers) {
        let totalRides = 0;
        let check_due_to_driver = 0;
        let total_cash_amount = 0;
        let check_due_to_app = 0;

        // Filter payments for the current driver
        const driverPayments = payments.filter((p) => String(p?.driver_id) == String(driver?._id));

        // Count total rides for the driver
        totalRides = driverPayments.length;

        // Calculate pending card payments due to the driver
        const pendingCardPayments = driverPayments.filter(
          (p) => p?.payment_type === 'card' && p?.payout_to_driver === 'pending'
        );

        for (const pending of pendingCardPayments) {
          const booking = await this.model.booking.findOne({ _id: pending.booking_id });
          check_due_to_driver += parseFloat(
            (pending.amount - pending.commision_amount - (booking?.gst || 0)).toFixed(2)
          );
        }

        // Calculate pending cash payments (offline) due to the app
        const offlinePayments = driverPayments.filter(
          (p) => p.payment_type === 'cash' && p.payout_to_driver === 'pending'
        );

        for (const offline of offlinePayments) {
          const booking = await this.model.booking.findOne({ _id: offline.booking_id });
          total_cash_amount += offline.commision_amount + (booking?.gst || 0);
        }

        check_due_to_app = parseFloat(total_cash_amount.toFixed(2));

        // Add the driver's data to the formatted array
        formattedData.push({
          driver_name: driver?.name,
          country_code: driver?.country_code,
          phone: driver?.phone,
          total_rides: totalRides,
          payment_due_to_driver: parseFloat(check_due_to_driver.toFixed(2)),
          payment_due_to_app: parseFloat(check_due_to_app.toFixed(2)),
        });
      }

      // Sort the data by total rides in descending order
      formattedData.sort((a, b) => b.total_rides - a.total_rides);

      return {
        week_data: formattedData,
      };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
}
