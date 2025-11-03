import { Injectable } from '@nestjs/common';

import { DbService } from 'src/db/db.service';
import { BookingService } from 'src/booking/booking.service';
import mongoose, { Types } from 'mongoose';
import { EarningAggregation } from './earning.aggregation';
import { CommonService } from 'src/common/common.service';
import Stripe from 'stripe';
import { InjectStripe } from 'nestjs-stripe';
import * as moment from 'moment';
import * as momentTz from 'moment-timezone';
import { log } from 'node:console';

@Injectable()
export class EarningService {
  constructor(
    private readonly model: DbService,
    private readonly bookingService: BookingService,
    private readonly earningAggregation: EarningAggregation,
    private readonly commonService: CommonService,
    @InjectStripe() private readonly stripe: Stripe,
  ) { }
  async create(booking_id) {
    try {
      const booking =
        await this.bookingService.find_booking_with_id(booking_id);
      await this.model.driverEarnings.create({
        driver_id: booking.driver_id,
        booking_id: booking._id,
        amount: booking.total_amount,
      });

      return { message: 'collect cash successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findAll(driver_id, status, timezone) {
    try {
      if (status.status === 'total') {
        const pipeline = await this.earningAggregation.driverEarning(driver_id)
        const earning = await this.model.booking.aggregate(pipeline)
        return {
          data: {
            no_of_trips: earning[0]?.total_bookings ?? 0,
            tips_from_rider: 0,
            total_tax_amount: earning[0]?.total_tax ?? 0,
            total_trips_amount: earning[0]?.total_amount ?? 0,
            amount_to_be_paid: earning[0]?.driver_earning ?? 0,
            app_commission: earning[0]?.app_commission ?? 0,
            total_amount_to_be_paid: earning[0]?.driver_earning ?? 0,
            cash_you_have: earning[0]?.total_invoice_amount ?? 0,
            you_need_to_pay: (earning[0]?.total_invoice_amount > earning[0]?.driver_earning) ? earning[0]?.total_invoice_amount - earning[0]?.driver_earning : 0,
          },
        };

      } else if (status.status === 'weekly') {
        const weekDates = []
        const formattedData = [];
        for (let i = 0; i < 4; i++) {
          // const startOfWeek = moment().subtract(i, 'week').startOf('week').valueOf();
          // const endOfWeek = moment().subtract(i, 'week').endOf('week').valueOf();
          const startOfWeek = momentTz().tz(timezone).subtract(i, 'weeks').startOf('week').valueOf();
          const endOfWeek = momentTz().tz(timezone).subtract(i, 'weeks').endOf('week').valueOf();
          const pipeline = await this.earningAggregation.driverEarning(driver_id, startOfWeek, endOfWeek)
          const earning = await this.model.booking.aggregate(pipeline);
          let total_bookings = earning[0]?.total_bookings ?? 0;
          if (total_bookings <= 0) continue
          let trip_amount = earning[0]?.total_amount - (earning[0]?.coupon_discount ?? 0);
          let to_be_paid_amount = trip_amount - (earning[0]?.app_commission ?? 0)
          formattedData.push({
            week_start: startOfWeek,
            week_end: endOfWeek,
            no_of_trips: total_bookings,
            tips_from_rider: 0,
            total_tax_amount: earning[0]?.total_tax ?? 0,
            total_trips_amount: trip_amount ?? 0,
            amount_to_be_paid: to_be_paid_amount ?? 0,
            app_commission: earning[0]?.app_commission ?? 0,
            // cash_you_have: earning[0]?.total_invoice_amount ?? 0,

            // when payment method is dtc we show driver's total amount in cash_you_have
            cash_you_have: earning[0]?.cash_you_have ?? 0,
            // total_amount_to_be_paid: (earning[0]?.total_invoice_amount < earning[0]?.driver_earning) ? earning[0]?.driver_earning - earning[0]?.total_invoice_amount : earning[0]?.driver_earning ?? 0,
            // you_need_to_pay: (earning[0]?.total_invoice_amount > earning[0]?.driver_earning) ? earning[0]?.total_invoice_amount - earning[0]?.driver_earning : 0,
            total_amount_to_be_paid: (earning[0]?.total_invoice_amount < to_be_paid_amount) ? to_be_paid_amount - earning[0]?.total_invoice_amount : to_be_paid_amount ?? 0,
            you_need_to_pay: (earning[0]?.total_invoice_amount > to_be_paid_amount) ? earning[0]?.total_invoice_amount - to_be_paid_amount : 0,
            payment_status: (endOfWeek > moment().valueOf()) ? 'pending' : 'completed',
            payout_initiated: moment(endOfWeek).add(1, 'day').valueOf(),
            pending_amount_pay_on: 0,
          });
        }
        return { weeklyData: formattedData };
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async AdminEarningListing(body) {
    try {
      let options = await this.commonService.set_options(body.page, body.limit);
      let data_to_aggregate;
      const start_date = parseInt(body.start_date);
      const end_date = parseInt(body.end_date);

      if (body.start_date && body.end_date) {
        data_to_aggregate = [
          await this.earningAggregation.DateFilterMatch(start_date, end_date),
          await this.earningAggregation.bookingIdLoopup(),
          await this.earningAggregation.project(),
          await this.earningAggregation.face_set(options),
        ];
      } else if (body.status === 'today') {
        data_to_aggregate = [
          await this.earningAggregation.Todaymatch(),
          await this.earningAggregation.bookingIdLoopup(),
          await this.earningAggregation.project(),
          await this.earningAggregation.face_set(options),
        ];
      } else if (body.status === 'week') {
        data_to_aggregate = [
          await this.earningAggregation.Weekmatch(),
          await this.earningAggregation.bookingIdLoopup(),
          await this.earningAggregation.project(),
          await this.earningAggregation.face_set(options),
        ];
      } else if (body.status === 'month') {
        data_to_aggregate = [
          await this.earningAggregation.monthmatch(),
          await this.earningAggregation.bookingIdLoopup(),
          await this.earningAggregation.project(),
          await this.earningAggregation.face_set(options),
        ];
      } else if (body.status === 'year') {
        data_to_aggregate = [
          await this.earningAggregation.Yearmatch(),
          await this.earningAggregation.bookingIdLoopup(),
          await this.earningAggregation.project(),
          await this.earningAggregation.face_set(options),
        ];
      }
      const data = await this.model.payments.aggregate(data_to_aggregate);
      return {
        count: data[0]?.count[0]?.count,
        total_earning: data[0]?.total_earning[0]?.total_earning,
        data: data[0]?.data,
      };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async driver_make_payment(body, driver_id) {
    try {
      const driver_data = await this.model.drivers.findOne({ _id: driver_id });
      const data = {
        amount: body.amount * 100,
        currency: 'usd',
        customer: driver_data.customer_id,
        automatic_payment_methods: { enabled: true },
        metadata: {
          week_start: body.week_start,
          week_end: body.week_end,
          amount: body.amount,
          type: 'driver_payment',
          user_id: String(driver_id),
        },
      };
      const intent = await this.stripe.paymentIntents.create(data);
      return {
        client_secret: intent?.client_secret,
        amount: Math.round(body.amount),
      };
    } catch (error) {
      console.log('error', error);

      throw error;
    }
  }

  async export_earning(body) {
    try {
      const result = await this.model.payments.aggregate([
        {
          $match: {
            created_at: { $gte: +body.start_date, $lte: +body.end_date }
          }
        },
        {
          $lookup: {
            from: 'bookings',
            localField: 'booking_id',
            foreignField: '_id',
            as: 'booking_id'
          }
        },
        {
          $unwind: '$booking_id'
        },
        {
          $match: { 'booking_id.booking_status': 'completed' } // Filter only completed bookings
        },
        {
          $lookup: {
            from: 'drivers',
            localField: 'driver_id',
            foreignField: '_id',
            as: 'driver_id'
          }
        },
        {
          $unwind: { path: '$driver_id', preserveNullAndEmptyArrays: true }
        },
        {
          $group: {
            _id: null,
            total_booking: { $sum: 1 },
            total_vat: { $sum: '$booking_id.gst' },
            payment_due_to_app: {
              $sum: {
                $cond: [{ $eq: ['$payment_type', 'cash'] }, { $add: ['$booking_id.gst', '$commision_amount'] }, 0]
              }
            },
            payment_due_to_driver: {
              $sum: {
                $cond: [{ $ne: ['$payment_type', 'cash'] }, { $add: ['$booking_id.gst', '$commision_amount'] }, 0]
              }
            },
            data: {
              $push: {
                amount: '$amount',
                commision_amount: '$commision_amount',
                payout_amount: '$payout_amount',
                created_at: '$created_at',
                booking_id: '$booking_id',
                driver_id: {
                  name: '$driver_id.name',
                  country_code: '$driver_id.country_code',
                  phone: '$driver_id.phone'
                }
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            total_booking: 1,
            total_vat: { $round: ['$total_vat', 2] },
            payment_due_to_app: { $round: ['$payment_due_to_app', 2] },
            payment_due_to_driver: { $round: ['$payment_due_to_driver', 2] },
            data: 1
          }
        }
      ])
      return result.length ? result[0] : {
        total_booking: 0,
        total_vat: "0.00",
        payment_due_to_app: "0.00",
        payment_due_to_driver: "0.00",
        data: []
      };
    } catch (error) {
      throw error
    }
  }


  // async export_earning(body) {
  //   try {
  //     const start_date = parseInt(body.start_date);
  //     const end_date = parseInt(body.end_date);
  //     let total_booking = 0
  //     let total_vat = 0
  //     let payment_due_to_app = 0
  //     let payment_due_to_driver = 0
  //     const data = await this.model.payments.aggregate([
  //       {
  //         $lookup: {
  //           from: "bookings", // The name of the Booking collection
  //           let: { booking_id: "$booking_id" },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: {
  //                   $and: [
  //                     { $eq: ["$_id", "$$booking_id"] }
  //                   ]
  //                 }
  //               }
  //             },
  //             {
  //               $project: {
  //                 booking_id: 1,
  //                 booking_status: 1,
  //                 ride_status: 1
  //               }
  //             }
  //           ],
  //           as: "booking_id"
  //         }
  //       },
  //       {
  //         $unwind: "$booking_id" // Flatten the array from lookup
  //       },
  //       {
  //         $lookup: {
  //           from: "drivers", // The name of the Booking collection
  //           let: { driver_id: "$driver_id" },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: {
  //                   $and: [
  //                     { $eq: ["$_id", "$$driver_id"] }
  //                   ]
  //                 }
  //               }
  //             },
  //             {
  //               $project: {
  //                 name: 1, country_code: 1, phone: 1
  //               }
  //             }
  //           ],
  //           as: "driver_id"
  //         }
  //       },
  //       {
  //         $unwind: "$driver_id" // Flatten the array from lookup
  //       },
  //       {
  //         $match: {
  //           "booking_id.booking_status": "completed" // Filter only completed bookings
  //         }
  //       },
  //       {
  //         $project: {
  //           amount: 1,
  //           commision_amount: 1,
  //           payout_amount: 1,
  //           created_at: 1,
  //           driver_id: 1,
  //           booking_id: 1, // If booking_id refers to bookingRef in Payment
  //           _id: 1, // Exclude the MongoDB _id field if not needed
  //         },
  //       },
  //     ])
  //     // const data = await this.model.payments.find({
  //     //   created_at: {
  //     //     $gte: start_date,
  //     //     $lte: end_date
  //     //   }
  //     // }).select('amount commision_amount payout_amount created_at driver_id booking_id').populate([
  //     //   {
  //     //     path: 'booking_id',
  //     //     select: 'booking_id' // Only include the booking_id field
  //     //   },
  //     //   {
  //     //     path: 'driver_id',
  //     //     select: 'name country_code phone' // Include only name, country_code, and phone fields
  //     //   }
  //     // ]);

  //     let payment_cash = await this.model.payments.find({
  //       payment_type: "cash", created_at: {
  //         $gte: start_date,
  //         $lte: end_date
  //       }
  //     })
  //     let payment_online = await this.model.payments.find({
  //       payment_type: { $ne: "cash" }, created_at: {
  //         $gte: start_date,
  //         $lte: end_date
  //       }
  //     })
  //     for (let cash of payment_cash) {
  //       let cash_booking = await this.model.booking.findOne({ _id: cash.booking_id })
  //       payment_due_to_app = cash_booking.gst + cash.commision_amount
  //     }
  //     for (let online of payment_online) {
  //       let online_booking = await this.model.booking.findOne({ _id: online.booking_id })
  //       console.log("online_booking", online_booking);

  //       payment_due_to_driver = (online_booking?.gst || 0) + online.commision_amount
  //     }
  //     for (const payment_data of data) {
  //       let booking = await this.model.booking.findOne({ _id: payment_data.booking_id })
  //       total_booking += 1
  //       total_vat += booking.gst
  //     }


  //     return {
  //       total_booking: total_booking,
  //       total_vat: total_vat.toFixed(2),
  //       payment_due_to_app: payment_due_to_app.toFixed(2),
  //       payment_due_to_driver: payment_due_to_driver.toFixed(2),
  //       data: data,
  //     };
  //   } catch (error) {
  //     console.log('error', error);
  //   }
  // }
}
