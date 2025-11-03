import { HttpException, HttpStatus, Injectable, Logger, Scope } from "@nestjs/common";
import {
    AssignDriverDto,
    BookingPaidUnpaidListDto,
    CalculateVehiclePriceDto,
    CancelBookingDto,
    CreateBookingByDispatcherDto,
    CreateBookingDto,
    DispatcherBookingStatus,
    DispatcherGetBookingsDto,
    DriverIdDto,
    DriverListOnDispatcherForAssignDto,
    paymentMethod,
    RideStatus,
    ScheduleBookingDto,
    Status,
    UpdateBookingDto,
} from "./dto/booking.dto";
import axios from "axios";
import { DbService } from "src/db/db.service";
import { CommonService } from "src/common/common.service";
import { v4 as uuidv4 } from "uuid";
import { count, error, log, time } from "console";
import * as mongosse from "mongoose";
import e from "express";
import { EventEmitter2 } from "@nestjs/event-emitter";
import mongoose from "mongoose";
import * as moment from "moment";
import * as momentTz from 'moment-timezone';
import { BookingAggregation } from "./booking.aggregation";
import { Types } from "mongoose";
import { app, messaging } from "firebase-admin";
import { DriverService } from "src/driver/driver.service";
import {
    BookingStatus,
    BookingType,
    PayToDriver,
    RequestType,
} from "./schema/booking.schema";
import { DriverStatus, ride_status } from "src/driver/schema/driver.schema";
import { CouponType } from "src/coupon/schema/coupon.schema";
import Stripe from "stripe";
import { InjectStripe } from "nestjs-stripe";
import * as fs from "fs";
import * as path from "path";
import * as Handlebars from "handlebars";
import { Vehicle_details } from "src/driver/schema/vehicle-detail.schema";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
// import { PaymentService } from 'src/payment/payment.service';
import { Server, Socket } from 'socket.io';
import { EmailService } from "src/common/common.emails.sesrvice";
import { NotificationService } from "src/notification/notification.service";
import { StaffRoles } from "src/auth/role/user.role";
import { NotifyFor } from "src/notification/schema/notification.schema";
import { ActivityService } from "src/activity/activity.service";

const vehicleSeatBookingMapByType = {
    Sedan: {
        4: [4],
    },
    SUV: {
        5: [4],
        6: [4, 5],
        7: [5, 6],
        8: [5, 6],
    },
    Minibus: {
        9: [5, 6, 7, 8],
        10: [5, 6, 7, 8, 9],
        11: [5, 6, 7, 8, 9, 10, 11],
    },
};


const escalationMap = {
    Sedan: ['Sedan'],
    SUV: ['SUV', 'Minibus'],
    Minibus: ['Minibus'],
};

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})

@Injectable()
export class BookingService {
    constructor(
        @InjectStripe() private readonly stripe: Stripe,
        private readonly model: DbService,
        private readonly commonService: CommonService,
        private readonly eventEmitter: EventEmitter2,
        private readonly bookingAggregation: BookingAggregation,
        private readonly emailService: EmailService,
        private readonly notification: NotificationService,
        private readonly activityService: ActivityService,

    ) { }
    @WebSocketServer() server: Server;


    async dispatcherDashboard() {
        try {
            const startOfWeek = moment().startOf("week").valueOf();
            const endOfWeek = moment().endOf("week").valueOf();
            const startOfDay = moment().startOf("week").valueOf();
            const endOfDay = moment().endOf("week").valueOf();
            const startOfMonth = moment().startOf("month").valueOf();
            const endOfMonth = moment().endOf("month").valueOf();
            const request = {
                total: await this.model.booking.countDocuments({
                    booking_status: {
                        $in: [
                            BookingStatus.Accept,
                            BookingStatus.Request,
                            null,
                        ],
                    },
                }),
                today: await this.model.booking.countDocuments({
                    booking_status: {
                        $in: [
                            BookingStatus.Accept,
                            BookingStatus.Request,
                            null,
                        ],
                    },
                    created_at: {
                        $gte: startOfDay,
                        $lte: endOfDay,
                    },
                }),

                weekly: await this.model.booking.countDocuments({
                    booking_status: {
                        $in: [
                            BookingStatus.Accept,
                            BookingStatus.Request,
                            null,
                        ],
                    },
                    created_at: {
                        $gte: startOfWeek,
                        $lte: endOfWeek,
                    },
                }),

                monthly: await this.model.booking.countDocuments({
                    booking_status: {
                        $in: [
                            BookingStatus.Accept,
                            BookingStatus.Request,
                            null,
                        ],
                    },
                    created_at: {
                        $gte: startOfMonth,
                        $lte: endOfMonth,
                    },
                }),
            };
            const waiting_for_driver = {
                total: await this.model.booking.countDocuments({
                    driver_id: null,
                }),
                today: await this.model.booking.countDocuments({
                    driver_id: null,
                    created_at: {
                        $gte: startOfDay,
                        $lte: endOfDay,
                    },
                }),
                weekly: await this.model.booking.countDocuments({
                    driver_id: null,
                    created_at: {
                        $gte: startOfWeek,
                        $lte: endOfWeek,
                    },
                }),
                monthly: await this.model.booking.countDocuments({
                    driver_id: null,
                    created_at: {
                        $gte: startOfMonth,
                        $lte: endOfMonth,
                    },
                }),
            };
            const available_driver = {
                total: await this.model.drivers.countDocuments({
                    status: DriverStatus.Online,
                }),
                today: await this.model.drivers.countDocuments({
                    status: DriverStatus.Online,
                    created_at: {
                        $gte: startOfDay,
                        $lte: endOfDay,
                    },
                }),
                weekly: await this.model.drivers.countDocuments({
                    status: DriverStatus.Online,
                    created_at: {
                        $gte: startOfWeek,
                        $lte: endOfWeek,
                    },
                }),
                monthly: await this.model.drivers.countDocuments({
                    status: DriverStatus.Online,
                    created_at: {
                        $gte: startOfMonth,
                        $lte: endOfMonth,
                    },
                }),
            };
            const schedule_assign_to_driver = {
                total: await this.model.booking.countDocuments({
                    schedule_date: { $ne: null },
                    driver_id: { $ne: null },
                }),
                today: await this.model.booking.countDocuments({
                    schedule_date: { $ne: null },
                    driver_id: { $ne: null },
                    created_at: {
                        $gte: startOfDay,
                        $lte: endOfDay,
                    },
                }),
                weekly: await this.model.booking.countDocuments({
                    schedule_date: { $ne: null },
                    driver_id: { $ne: null },
                    created_at: {
                        $gte: startOfWeek,
                        $lte: endOfWeek,
                    },
                }),
                monthly: await this.model.booking.countDocuments({
                    schedule_date: { $ne: null },
                    driver_id: { $ne: null },
                    created_at: {
                        $gte: startOfMonth,
                        $lte: endOfMonth,
                    },
                }),
            };
            return {
                request,
                waiting_for_driver,
                available_driver,
                schedule_assign_to_driver,
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async create(body: CreateBookingDto, user_id: string) {
        try {
            console.log(body, '<----payload received');

            let additional_fee = 0;
            let pending_booking_amount = 0;

            let customer = await this.model.customers.findOne({ _id: user_id });
            if (customer.pending_pay_amount > 0) {
                pending_booking_amount = customer.pending_pay_amount;
            }
            let distanceFromSyndeyAirport = await this.commonService.checkDistancefromSydney(
                body.pick_up_lat,
                body.pick_up_long
            );
            if (Number(distanceFromSyndeyAirport) > 30) {
                additional_fee = 25;
            }
            const distance_with_stops =
                await this.commonService.calculateDistanceWithStops(
                    body.pick_up_lat,
                    body.pick_up_long,
                    body.drop_lat,
                    body.drop_long,
                    body.stops
                );
            console.log(distance_with_stops, '<-----distance_with_stops');

            const pickup = { lat: body.pick_up_lat, long: body.pick_up_long };
            const dest = { lat: body.drop_lat, long: body.drop_long };

            let toll_charges = await this.commonService.calculateTotalTollCharges(
                pickup,
                body.stops,
                dest
            );
            //<<<<<<< FIND VEHICLE PRICE >>>>>>>>>>
            const vehicle_pricing: any = await this.model.vehicle.findOne({
                vehicle_id: body.vehicle_id,
                is_active: true,
            });

            const calculation_data = await this.calculatePricingAtPay(distance_with_stops, body, toll_charges, additional_fee, pending_booking_amount, user_id)
            console.log("calculated_data====>", calculation_data);

            const data = await this.create_booking(
                body,
                toll_charges,
                calculation_data,
                calculation_data.coupon_price ? calculation_data.coupon_price : 0,
                user_id,
                distance_with_stops,
                calculation_data.base_fee,
                calculation_data.coupan_discount_amount,
                vehicle_pricing,
                additional_fee
            );
            let customer_detail
            if (!customer.customer_id) {
                const stripe_customer_id = await this.stripe.customers.create({
                    name: customer.name,
                    email: customer.email,
                });
                customer_detail = await this.model.customers.findByIdAndUpdate(
                    { _id: customer._id },
                    { customer_id: stripe_customer_id.id },
                    { new: true }
                );
            }

            const data_to_send: any = {
                amount: +(calculation_data?.total_amount * 100).toFixed(2),
                currency: "aud",
                customer: customer?.customer_id || customer_detail.customer_id,
                automatic_payment_methods: { enabled: true },
                metadata: {
                    type: paymentMethod.Card,
                    booking_type: "create",
                    user_id: String(customer?._id),
                    booking_id: String(data._id),
                },
            };
            const intent =
                await this.stripe.paymentIntents.create(data_to_send);
            return {
                client_secret: intent?.client_secret,
                amount: parseFloat((data?.total_amount).toFixed(2)),
            };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async createBookingByDispatcher(
        body: CreateBookingByDispatcherDto,
        user_id: string
    ) {
        try {
            let create = await this.schedule_bookingByDispatcher(
                body,
                body.company_id,
                user_id
            );
            const payload = {
                title: `New Ride Request!`,
                message: `A new ride request is available`
            }
            const isCatch = false
            this.notifyDispatcher(payload, isCatch)
            return create;
        } catch (error) {
            console.log("from createBookingByDispatcher ===>", error);
            throw error;
        }
    }

    async updateBookingByDispatcher(
        booking_id: string,
        body: CreateBookingByDispatcherDto,
        user_id: string
    ) {
        try {
            let create = await this.update_schedule_bookingByDispatcher(booking_id,
                body,
                body.company_id,
                user_id
            );
            return create;
        } catch (error) {
            console.log("from updateBookingByDispatcher ===>", error);
            throw error;
        }
    }

    async updateDriverIncomeByDispatcher(
        booking_id: string,
        body: CreateBookingByDispatcherDto
    ) {
        try {
            let update = await this.model.booking.findByIdAndUpdate(booking_id, { amount_for_driver: body.amount_for_driver }, { new: true })
            return { data: update };
        } catch (error) {
            console.log("from updateDriverIncomeByDispatcher ===>", error);
            throw error;
        }
    }


    async notifyDispatcher(payload, isCatch: boolean, driver?, booking?) {
        try {
            let dispatcherList = await this.model.admin.find({ email: { $ne: 'admin@gmail.com' }, roles: { $in: [StaffRoles.dispatcher] } })
            const dispatcherListIds = dispatcherList.map((res) => res?._id)

            const session = await this.model.sessions.find({ user_id: { $in: dispatcherListIds } })

            const tokens = session
                .filter(s => s.fcm_token && s.fcm_token.length > 100)
                .map(s => s.fcm_token);

            console.log("dispatcher tokesn", tokens);
            this.notification.send_notification(payload, tokens, { type: "booking_update" })

            if (isCatch) {
                console.log(dispatcherListIds, '<---dispatcherListIds');

                Promise.all(dispatcherListIds.map((dispatcherId) => {
                    this.model.notification.create({
                        meta_data: { booking, driver, payload },
                        send_to: new Types.ObjectId(dispatcherId),
                        title: payload.title,
                        body: payload.message,
                        notify_for: NotifyFor.Booking,
                        created_at: moment().utc().valueOf()
                    })
                }))
            }
        } catch (error) {
            throw error
        }
    }

    async createBookingBywebApp(body: CreateBookingByDispatcherDto) {
        try {
            let customer_id;
            const customer_already_exist = await this.model.customers.findOne({
                $or: [{ phone: body.phone }, { temp_phone: body.phone }],
            });

            if (!customer_already_exist) {
                const stripe_customer_id = await this.stripe.customers.create({
                    name: body.phone,
                    email: body.email,
                });
                const user = await this.model.customers.create({
                    temp_email: body.email,
                    name: body.name,
                    temp_country_code: body.country_code,
                    temp_phone: body.phone,
                    customer_id: stripe_customer_id.id,
                });
                customer_id = user._id;
            }
            else {
                await this.model.customers.updateOne({ _id: customer_already_exist._id }, { name: body.name, temp_email: body.email })
            }
            let otp = await this.generateOtp();

            let create = await this.schedule_bookingForWebApp(
                body,
                body.company_id,
                customer_already_exist?._id || customer_id,
                otp
            );

            return create;
        } catch (error) {
            console.log("from createBookingByDispatcher ===>", error);
            throw error;
        }
    }

    async schedule_booking(
        body: ScheduleBookingDto,
        customer_id: string,
        dispatcher_id?: string
    ) {
        try {
            console.log(body, '<----payload received');

            let additional_fee = 0;
            let pending_booking_amount = 0;
            let customer = await this.model.customers.findOne({
                _id: customer_id,
            });
            if (customer.pending_pay_amount > 0) {
                pending_booking_amount = customer.pending_pay_amount;
            }

            const scheduleBooking = await this.model.booking.find({
                customer_id: customer_id,
                booking_type: { $in: [BookingType.Schedule, BookingType.Scheduled_draft] },
                payment_success: true,
                booking_status: { $nin: [BookingStatus.Cancelled, BookingStatus.Completed, BookingStatus.Failed] }
            });
            for (const booking of scheduleBooking) {
                const scheduleTime = booking.schedule_date;
                const oneHourBefore = moment(scheduleTime).subtract(1, 'hour').valueOf() // One hour before the scheduled time
                const oneHourAfter = moment(scheduleTime).add(1, 'hour').valueOf() // One hour after the scheduled time

                if (
                    body.scheduled_date >= oneHourBefore &&
                    body.scheduled_date <= oneHourAfter
                ) {
                    throw new HttpException(
                        {
                            error_code: "already_scheduled",
                            error_description: "already_scheduled",
                        },
                        HttpStatus.BAD_REQUEST
                    );
                }
            }
            let distanceFromSyndeyAirport = await this.commonService.checkDistancefromSydney(
                body.pick_up_lat,
                body.pick_up_long
            );
            if (Number(distanceFromSyndeyAirport) > 30) {
                additional_fee = 25;
            }
            const distance_with_stops = await this.commonService.calculateDistanceWithStops(
                body.pick_up_lat,
                body.pick_up_long,
                body.drop_lat,
                body.drop_long,
                body.stops
            );

            const pickup = { lat: body.pick_up_lat, long: body.pick_up_long };
            const dest = { lat: body.drop_lat, long: body.drop_long };

            let toll_charges = await this.commonService.calculateTotalTollCharges(
                pickup,
                body.stops,
                dest
            );
            //<<<<<<< FIND VEHICLE PRICES >>>>>>>>>>
            const vehicle_pricing: any = await this.model.vehicle.findOne({
                vehicle_id: body.vehicle_id,
            });

            //<<<<<<<< CALCULATION TOTAL AMOUNT >>>>>>>>>
            const calculation_data = await this.calculatePricingAtPay(distance_with_stops, body, toll_charges, additional_fee, pending_booking_amount, customer_id)
            console.log("calculated_data====>", calculation_data);
            //<<<<<<<<<<<< CREATE BOOKING >>>>>>>>>>>>>
            const data = await this.create_booking(
                body,
                toll_charges,
                calculation_data,
                calculation_data.coupon_price ? calculation_data.coupon_price : 0,
                customer_id,
                distance_with_stops,
                calculation_data.base_fee,
                calculation_data.coupan_discount_amount,
                vehicle_pricing,
                additional_fee,
                dispatcher_id
            );

            const data_to_send: any = {
                amount: parseFloat(
                    ((calculation_data?.total_amount || 0) * 100).toFixed(2)
                ),
                currency: "aud",
                customer: customer?.customer_id,
                automatic_payment_methods: { enabled: true },
                metadata: {
                    type: paymentMethod.Card,
                    booking_type: "schedule_booking",
                    user_id: String(customer?._id),
                    booking_id: String(data._id),
                },
            };
            const intent = await this.stripe.paymentIntents.create(data_to_send);
            return {
                client_secret: intent?.client_secret,
                amount: Math.round(data?.total_amount),
                booking_id: data._id,
            };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }


    async ready_now_schedule_booking(booking_id, customer_id) {
        try {
            let booking: any = await this.model.booking.findOne({ _id: new Types.ObjectId(booking_id) }).lean();
            await this.model.customers.findOneAndUpdate(
                {
                    _id: booking.customer_id,
                },
                {
                    current_booking: booking._id,
                    // pending_pay_amount: 0,
                }, { new: true }
            );
            this.send_push_to_nearest_drivers(booking, customer_id);
            return { message: "Searching for drivers" }
        } catch (error) {
            throw error
        }
    }

    async schedule_bookingByDispatcher(
        body: ScheduleBookingDto,
        company_id: string,
        dispatcher_id?: string,
        otp?: Number
    ) {
        try {
            let additional_fee = 0;
            let pending_booking_amount = 0;

            // ⏱️ Time: Distance from Sydney Airport
            console.time('checkDistancefromSydney');
            const distanceFromSyndeyAirport = await this.commonService.checkDistancefromSydney(
                body.pick_up_lat,
                body.pick_up_long
            );
            console.timeEnd('checkDistancefromSydney');

            if (Number(distanceFromSyndeyAirport) > 30) {
                additional_fee = 25;
            }

            // ⏱️ Time: Distance with Stops
            console.time('calculateDistanceWithStops');
            const distance_with_stops = await this.commonService.calculateDistanceWithStops(
                body.pick_up_lat,
                body.pick_up_long,
                body.drop_lat,
                body.drop_long,
                body.stops
            );
            console.timeEnd('calculateDistanceWithStops');

            const pickup = { lat: body.pick_up_lat, long: body.pick_up_long };
            const dest = { lat: body.drop_lat, long: body.drop_long };

            // ⏱️ Time: Toll Charges
            console.time('calculateTotalTollCharges');
            const toll_charges = await this.commonService.calculateTotalTollCharges(
                pickup,
                body.stops,
                dest
            );
            console.timeEnd('calculateTotalTollCharges');

            // ⏱️ Time: Fetch Vehicle Pricing
            console.time('vehiclePricingQuery');
            const vehicle_pricing: any = await this.model.vehicle.findOne({
                vehicle_id: body.vehicle_id,
            });
            console.timeEnd('vehiclePricingQuery');

            // ⏱️ Time: Pricing Calculation
            console.time('calculatePricingAtPay');
            const calculation_data = await this.calculatePricingAtPay(
                distance_with_stops,
                body,
                toll_charges,
                additional_fee,
                pending_booking_amount,
                dispatcher_id
            );
            console.timeEnd('calculatePricingAtPay');

            // ⏱️ Time: Booking Creation
            console.time('create_booking_schedule');
            const data = await this.create_booking_schedule(
                body,
                toll_charges,
                calculation_data,
                calculation_data.coupon_price || 0,
                company_id,
                distance_with_stops,
                calculation_data.total_amount,
                calculation_data.coupan_discount_amount,
                vehicle_pricing,
                additional_fee,
                dispatcher_id,
                otp
            );
            console.timeEnd('create_booking_schedule');

            return { data };
        } catch (error) {
            console.log("error", error); // Retain for debugging
            throw error;
        }
    }

    // async schedule_bookingByDispatcher(body: ScheduleBookingDto, company_id: string, dispatcher_id?: string, otp?: Number) {
    //     try {
    //         // let base_fee_discount;
    //         // let coupon_price;
    //         // let child_seat_charge = 0;
    //         // let wheel_chair_charge = 0;
    //         let additional_fee = 0;
    //         let pending_booking_amount = 0;

    //         let distanceFromSyndeyAirport = await this.commonService.checkDistancefromSydney(
    //             body.pick_up_lat,
    //             body.pick_up_long
    //         );
    //         if (Number(distanceFromSyndeyAirport) > 30) {
    //             additional_fee = 25;
    //         }
    //         const distance_with_stops = await this.commonService.calculateDistanceWithStops(
    //             body.pick_up_lat,
    //             body.pick_up_long,
    //             body.drop_lat,
    //             body.drop_long,
    //             body.stops
    //         );

    //         const pickup = { lat: body.pick_up_lat, long: body.pick_up_long };
    //         const dest = { lat: body.drop_lat, long: body.drop_long };

    //         let toll_charges = await this.commonService.calculateTotalTollCharges(
    //             pickup,
    //             body.stops,
    //             dest
    //         );
    //         //<<<<<<< FIND VEHICLE PRICES >>>>>>>>>>
    //         const vehicle_pricing: any = await this.model.vehicle.findOne({
    //             vehicle_id: body.vehicle_id,
    //         });

    //         // if (body.filter?.includes("wheel_chair")) {
    //         //     wheel_chair_charge = vehicle_pricing.wheel_chair_charges;
    //         // }
    //         // if (body.filter?.includes("child_seat")) {
    //         //     child_seat_charge = vehicle_pricing.wheel_chair_charges;
    //         // }

    //         // const configuration: any = await this.model.appConfiguration.find();

    //         //<<<<<<<<<< CALCULATE DISTANCE PRICE >>>>>>>>>>>
    //         // const total_km_price = Math.round(
    //         //     distance_with_stops * vehicle_pricing.distance_price
    //         // );

    //         //<<<<<<<<<< CALCULAT BASE FEE WITH ADDING MIN BASE FARE AND DISTANCE PRICE >>>>>>>>>>>
    //         // const base_fee =
    //         //     Number(vehicle_pricing.base_fare) +
    //         //     Number(total_km_price) +
    //         //     additional_fee +
    //         //     toll_charges;

    //         //<<<<<<<<<< CHECK SURCHARGE AMOUNT IF DATE EXIST >>>>>>>>>>>>
    //         // const surcharge_amount = await this.check_surcharge_date(
    //         //     body.vehicle_id,
    //         //     body.pick_up_lat,
    //         //     body.pick_up_long
    //         // );

    //         const calculation_data = await this.calculatePricingAtPay(distance_with_stops, body, toll_charges, additional_fee, pending_booking_amount, dispatcher_id)
    //         // await this.calculate_booking_amount(
    //         //     base_fee,
    //         //     coupon_price ? coupon_price : 0,
    //         //     configuration[0].tax.tax_percentage,
    //         //     surcharge_amount,
    //         //     child_seat_charge,
    //         //     wheel_chair_charge,
    //         //     pending_booking_amount
    //         // );

    //         //<<<<<<<<<<<< CREATE BOOKING >>>>>>>>>>>>>
    //         const data = await this.create_booking_schedule(
    //             body,
    //             toll_charges,
    //             calculation_data,
    //             calculation_data.coupon_price ? calculation_data.coupon_price : 0,
    //             company_id,
    //             distance_with_stops,
    //             calculation_data.total_amount,
    //             calculation_data.coupan_discount_amount,
    //             vehicle_pricing,
    //             additional_fee,
    //             // dispatcher_id,
    //             dispatcher_id,
    //             otp
    //         );
    //         return { data: data };
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    async update_schedule_bookingByDispatcher(booking_id: string, body: ScheduleBookingDto, company_id: string, dispatcher_id?: string) {
        try {
            let additional_fee = 0;
            let pending_booking_amount = 0;

            let distanceFromSyndeyAirport = await this.commonService.checkDistancefromSydney(
                body.pick_up_lat,
                body.pick_up_long
            );
            if (Number(distanceFromSyndeyAirport) > 30) {
                additional_fee = 25;
            }
            const distance_with_stops = await this.commonService.calculateDistanceWithStops(
                body.pick_up_lat,
                body.pick_up_long,
                body.drop_lat,
                body.drop_long,
                body.stops
            );

            const pickup = { lat: body.pick_up_lat, long: body.pick_up_long };
            const dest = { lat: body.drop_lat, long: body.drop_long };

            let toll_charges = await this.commonService.calculateTotalTollCharges(
                pickup,
                body.stops,
                dest
            );
            //<<<<<<< FIND VEHICLE PRICES >>>>>>>>>>
            const vehicle_pricing: any = await this.model.vehicle.findOne({
                vehicle_id: body.vehicle_id,
            });

            const calculation_data = await this.calculatePricingAtPay(distance_with_stops, body, toll_charges, additional_fee, pending_booking_amount, dispatcher_id)


            //<<<<<<<<<<<< CREATE BOOKING >>>>>>>>>>>>>
            const data = await this.update_booking_schedule(
                booking_id,
                body,
                toll_charges,
                calculation_data,
                calculation_data.coupon_price ? calculation_data.coupon_price : 0,
                company_id,
                distance_with_stops,
                calculation_data.total_amount,
                calculation_data.coupan_discount_amount,
                vehicle_pricing,
                additional_fee,
                dispatcher_id,
            );
            return { data: data };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async schedule_bookingForWebApp(
        body,
        company_id: string,
        user_id: string,
        otp?: Number
    ) {
        try {
            let additional_fee = 0;
            let pending_booking_amount = 0;
            let customer_detail;
            let customer = await this.model.customers.findOne({ _id: user_id });

            let distanceFromSyndeyAirport = await this.commonService.checkDistancefromSydney(
                body.pick_up_lat,
                body.pick_up_long
            );
            if (Number(distanceFromSyndeyAirport) > 30) {
                additional_fee = 25;
            }
            const distance_with_stops = await this.commonService.calculateDistanceWithStops(
                body.pick_up_lat,
                body.pick_up_long,
                body.drop_lat,
                body.drop_long,
                body.stops
            );
            const pickup = { lat: body.pick_up_lat, long: body.pick_up_long };
            const dest = { lat: body.drop_lat, long: body.drop_long };

            let toll_charges = await this.commonService.calculateTotalTollCharges(
                pickup,
                body.stops,
                dest
            );
            //<<<<<<< FIND VEHICLE PRICES >>>>>>>>>>
            const vehicle_pricing: any = await this.model.vehicle.findOne({
                vehicle_id: body.vehicle_id,
            });

            const calculation_data = await this.calculatePricingAtPay(distance_with_stops, body, toll_charges, additional_fee, pending_booking_amount, user_id)

            const data = await this.create_booking_schedule_for_web_app(
                body,
                toll_charges,
                calculation_data,
                calculation_data.coupon_price ? calculation_data.coupon_price : 0,
                company_id,
                distance_with_stops,
                calculation_data.total_amount,
                calculation_data.coupan_discount_amount,
                vehicle_pricing,
                additional_fee,
                otp,
                customer
            );

            if (!customer.customer_id) {
                const stripe_customer_id = await this.stripe.customers.create({
                    name: customer.name,
                    email: customer.email,
                });
                customer_detail = await this.model.customers.updateOne(
                    { _id: customer._id },
                    { customer_id: stripe_customer_id.id },
                    { new: true }
                );
            }

            const data_to_send: any = {
                amount: +(calculation_data?.total_amount * 100).toFixed(2),
                currency: "aud",
                customer: customer?.customer_id || customer_detail.customer_id,
                automatic_payment_methods: { enabled: true },
                metadata: {
                    type: paymentMethod.Card,
                    booking_type: "schedule_booking",
                    booking_from: "web",
                    user_id: String(customer?._id),
                    booking_id: String(data?._id),
                    otp: otp,
                    name: body.name,
                    email: body.email,
                    waiting_charge: vehicle_pricing.stop_charges
                },
            };
            const intent = await this.stripe.paymentIntents.create(data_to_send);
            return {
                client_secret: intent?.client_secret,
                amount: parseFloat((data?.total_amount).toFixed(2)),
            };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async update(body: UpdateBookingDto, booking_id) {
        try {
            let pending_booking_amount = 0;
            let toll_charge = 0
            let additional_fee = 0
            const booking: any = await this.find_booking_with_id(booking_id);
            console.log(booking?.customer_id?._id, '<---booking?.customer_id?._id');
            console.log(booking?.customer_id, '<---booking?.customer_id?._id');

            let customer = await this.model.customers.findOne({ _id: booking?.customer_id, });
            console.log(customer?.pending_pay_amount, '<---customer?.pending_pay_amount');

            if (customer?.pending_pay_amount > 0) {
                pending_booking_amount = customer?.pending_pay_amount ?? 0;
                console.log(pending_booking_amount, '<---pending_booking_amount');

            }

            //<<<<<<<<<< CALCULATE DISTANCE WITH STOP >>>>>>>>>>>>
            const distance_with_stops = await this.commonService.calculateDistanceWithStops(
                booking.pickup_lat,
                booking.pickup_long,
                booking.drop_lat,
                booking.drop_long,
                body.stops
            );

            // //<<<<<<< FIND VEHICLE PRICES >>>>>>>>>>
            // const vehicle_pricing: any = await this.model.vehicle.findOne({
            //     vehicle_id: booking.vehicle_id,
            // });
            // //<<<<<<<<<< CALCULATE DISTANCE PRICE >>>>>>>>>>>
            // const total_km_price = Math.round(distance_with_stops * vehicle_pricing.distance_price);
            // //<<<<<<<<<< CALCULAT BASE FEE WITH ADDING MIN BASE FARE AND DISTANCE PRICE >>>>>>>>>>>
            // const base_fee = Number(vehicle_pricing.base_fare) + Number(total_km_price);

            //<<<<<<<< CALCULATION TOTAL AMOUNT >>>>>>>>>
            const calculation_data = await this.calculatePricingAtPay(distance_with_stops, booking, toll_charge, additional_fee, pending_booking_amount, customer?._id)

            //<<<<<<< UPDATE BOOKING >>>>>>>>>>>
            await this.model.booking.updateOne(
                { _id: booking_id },
                {
                    base_fee: calculation_data?.base_fee,
                    stops: body.stops,
                    gst: calculation_data.gst_amount,
                    coupon_discount: booking?.coupon_id ? calculation_data.coupon_price : 0,
                    total_amount: calculation_data.total_amount,
                    distance_in_km: distance_with_stops,
                    // when invoice is unpaid its invoice_number number will be there
                    ...(body.invoice_number) && { invoice_number: body.invoice_number, payment_method: "invoice" },
                    // when invoice is paid its transaction number will be there
                    ...(body.transaction_number) && { transaction_number: body.transaction_number, payment_method: "invoice" }

                }
            );

            // Booking activity logs

            this.activityService.logActivity({
                booking_id: booking_id, userId: booking?.customer_id, action: "UPDATED", resource: "booking", description: "Booking updated", payload: {
                    base_fee: calculation_data?.base_fee,
                    stops: body.stops,
                    gst: calculation_data.gst_amount,
                    coupon_discount: booking?.coupon_id ? calculation_data.coupon_price : 0,
                    total_amount: calculation_data.total_amount,
                    distance_in_km: distance_with_stops,
                    // when invoice is unpaid its invoice_number number will be there
                    ...(body.invoice_number) && { invoice_number: body.invoice_number, payment_method: "invoice" },
                    // when invoice is paid its transaction number will be there
                    ...(body.transaction_number) && { transaction_number: body.transaction_number, payment_method: "invoice" }

                }
            });

            // >>>>>>>> FETCH DRIVER FCM TOKEN AND SEND THE PUSH NOTIFICATION >>>>>>>>>>
            if (body.stops && booking.driver_id) {
                let driver = await this.model.drivers.findOne({
                    _id: booking.driver_id,
                });
                let driverFcm_token = await this.model.sessions.find({
                    user_id: booking.driver_id,
                    scope: "driver",
                });

                const key = "stop_update_title";
                const key_1 = "stop_update_description";
                const stop_title = await this.commonService.localization(
                    driver.preferred_language,
                    key
                );
                const stop_description = await this.commonService.localization(
                    driver.preferred_language,
                    key_1
                );
                const booking_data: any =
                    await this.find_booking_with_id(booking_id);

                for (const fcm_token of driverFcm_token) {
                    let pushData = {
                        title: stop_title[driver.preferred_language],
                        message: stop_description[driver.preferred_language],
                    };
                    let data_push = {
                        booking: booking_data,
                        type: "booking_update",
                    };
                    try {
                        this.notification.send_notification(
                            pushData,
                            fcm_token.fcm_token,
                            data_push
                        );
                    } catch (error) {
                        console.log('notification failed ---->', error);
                    }
                }
            }
            return { message: "Booking update successfully" };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async availableDriverforThisBooking(id: string, payload: DriverIdDto, completeRequest) {
        try {
            let query: any = {};
            const options = await this.commonService.set_options(
                payload?.pagination,
                payload?.limit
            );

            console.log('payload', payload);
            const requetUrl = completeRequest.path; //           



            if (payload.status === Status.AvailableNow) {
                const schedule_booking = await this.model.booking
                    .find({
                        booking_type: BookingType.Schedule,
                        schedule_date: {
                            $gte: moment().subtract(30, "minutes").valueOf(), // 30 minutes before current time
                            $lt: moment().add(30, "minutes").valueOf(), // 30 minutes after current time
                        },
                    })
                    .select("driver_id");

                const current_booking = await this.model.booking
                    .find({
                        booking_status: {
                            $nin: [
                                BookingStatus.Cancelled,
                                BookingStatus.Completed,
                                BookingStatus.Failed,
                            ],
                        },
                        created_at: {
                            $gte: moment().add(30, "minutes").valueOf(), // More than 30 minutes ago
                        },
                    })
                    .select("driver_id");

                const excludedDriverIds = [
                    ...schedule_booking.map((driver) => driver.driver_id),
                    ...current_booking.map((driver) => driver.driver_id),
                ];

                //console.log('excludedDriverIds', excludedDriverIds)
                query = {
                    status: DriverStatus.Online,
                    ...(payload?.vehicle_id && { vehicle_type_id: new mongosse.Types.ObjectId() || { $ne: null }, }),
                    is_active: true,
                    is_deleted: false,
                    is_block: false,
                    is_approved: true,
                    latitude: { $ne: null },
                    longitude: { $ne: null },
                    ...(payload?.search && {
                        $or: [
                            {
                                name: {
                                    $regex: payload?.search,
                                    $options: "i",
                                },
                            },
                            {
                                phone: {
                                    $regex: payload?.search,
                                    $options: "i",
                                },
                            },
                        ],
                    }),
                    _id: { $nin: excludedDriverIds },
                };

                const data: any = await this.model.drivers.find(query, {}, options);

                //console.log('data', data)
                for (const driver of data) {
                    let vehicle_detail: any = await this.model.vehicle_detail.findOne({ driver_id: driver._id, status: "active" }).populate([{ path: 'vehicle_id', model: 'Vehicle_types' }])
                    driver.vehicle_detail = vehicle_detail || null;
                }
                const count = await this.model.drivers.countDocuments(query);
                return { data, count: count };
            } else {
                const booking = await this.model.booking
                    .findOne({ _id: new Types.ObjectId(id) })
                    .populate("driver_id");
                // console.log('booking', booking)
                if (booking) {
                    const schedule_booking = await this.model.booking
                        .find({
                            booking_type: BookingType.Schedule,
                            booking_status: {
                                $nin: [
                                    BookingStatus.Cancelled,
                                    BookingStatus.Completed,
                                    BookingStatus.Failed,
                                ],
                            },
                            schedule_date: {
                                $gte: moment(booking?.schedule_date ?? booking?.created_at)
                                    .subtract(30, "minutes")
                                    .valueOf(), // 30 minutes before current time
                                $lt: moment(booking?.schedule_date ?? booking?.created_at)
                                    .add(30, "minutes")
                                    .valueOf(), // 30 minutes after current time
                            },
                        })
                        .select("driver_id");

                    //console.log('schedule_booking', schedule_booking)

                    const current_booking = await this.model.booking
                        .find({
                            booking_status: {
                                $nin: [
                                    BookingStatus.Cancelled,
                                    BookingStatus.Completed,
                                    BookingStatus.Failed,
                                ],
                            },
                            created_at: {
                                $gte: moment(booking?.schedule_date ?? booking?.created_at)
                                    .add(30, "minutes")
                                    .valueOf(), // More than 30 minutes ago
                            },
                        })
                        .select("driver_id");

                    const excludedDriverIds = [
                        ...schedule_booking.map((driver) => driver.driver_id),
                        ...current_booking.map((driver) => driver.driver_id),
                    ];

                    console.log('excludedDriverIds', excludedDriverIds)

                    query = {
                        //vehicle_type_id: new mongosse.Types.ObjectId(payload?.vehicle_id) || { $ne: null },
                        vehicle_type_id: { $ne: null }, // always include vehicle_type_id filter first if it's required
                        is_deleted: false,
                        is_block: false,
                        is_active: true,
                        is_approved: true,
                        latitude: { $ne: null },
                        longitude: { $ne: null },
                        _id: { $nin: excludedDriverIds },

                        // Conditional filters based on booking
                        // ...(booking.handbags && { "vehicle_type_id.handbags": { $gte: booking.handbags } }),
                        // ...(booking.luggage && { "vehicle_type_id.luggage": { $gte: booking.luggage } }),
                        // ...(booking.passenger && { "vehicle_type_id.passenger": { $gte: booking.passenger } }),

                        // Search
                        ...(payload?.search && {
                            $or: [
                                { name: { $regex: payload.search, $options: "i" } },
                                { phone: { $regex: payload.search, $options: "i" } },
                            ],
                        }),
                    };

                    // console.log('############ query', query)
                }

                let driver: any = booking?.driver_id;

                if (!booking) {

                    console.log("IN - !booking ");

                    if (requetUrl == "/booking/driver/dispatcher") {
                        query = {
                            //status: DriverStatus.Online,
                            status: { $in: [DriverStatus.Offline, DriverStatus.Online] },
                            is_deleted: false,
                            is_block: false,
                            is_active: true,
                            is_approved: true,
                            latitude: { $ne: null },
                            longitude: { $ne: null },
                            doc_expiry_type: { $eq: null },
                            ...(payload?.search && {
                                $or: [
                                    {
                                        name: {
                                            $regex: payload?.search,
                                            $options: "i",
                                        },
                                    },
                                    {
                                        phone: {
                                            $regex: payload?.search,
                                            $options: "i",
                                        },
                                    },
                                ],
                            }),
                        };

                    } else {

                        query = {
                            status: DriverStatus.Online,
                            is_deleted: false,
                            is_block: false,
                            is_active: true,
                            is_approved: true,
                            latitude: { $ne: null },
                            longitude: { $ne: null },
                            doc_expiry_type: { $eq: null },
                            ...(payload?.search && {
                                $or: [
                                    {
                                        name: {
                                            $regex: payload?.search,
                                            $options: "i",
                                        },
                                    },
                                    {
                                        phone: {
                                            $regex: payload?.search,
                                            $options: "i",
                                        },
                                    },
                                ],
                            }),
                        };

                    }
                }
                const drivers: any = await this.model.drivers.find(query, {}, options).populate({
                    path: "vehicle_type_id",
                    select: "handbags luggage passenger"
                });

                // console.log('drivers >>>>>>>>>>>>>>>>>>>', drivers)

                // if (booking.handbags || booking.luggage) {
                //     drivers = drivers.filter(driver => {
                //         const vehicle = driver.vehicle_type_id;
                //         if (!vehicle) return false;

                //         return (!booking.handbags || vehicle.handbags >= booking.handbags) &&
                //             (!booking.luggage || vehicle.luggage >= booking.luggage) &&
                //             (!booking.passenger || vehicle.passenger >= booking.passenger);
                //     });
                // }

                const data = (booking) ? [] : drivers;
                // console.log('booking', {
                //     _id: booking?._id,
                //     passenger: booking?.passenger,
                //     no_of_childcapsule: booking?.no_of_childcapsule,
                //     no_of_childseat: booking?.no_of_childseat,
                //     no_of_wheelchair: booking?.no_of_wheelchair,
                //     handbags: booking?.handbags,
                //     luggage: booking?.luggage,
                // })
                for (const driver of drivers) {
                    // console.log('driver', driver)
                    const query = {
                        driver_id: driver?._id,
                        status: "active",
                        ...(booking?.passenger) && { no_of_seat: { $gte: booking?.passenger } },
                        ...(booking?.no_of_childcapsule) && {
                            child_capsule_availabilty: true,
                            no_of_childcapsule: { $gte: booking?.no_of_childcapsule }
                        },
                        ...(booking?.no_of_childseat) && {
                            child_seat_availabilty: true,
                            no_of_childseat: { $gte: booking?.no_of_childseat }
                        },
                        ...(booking?.no_of_wheelchair) && {
                            wheel_chair_availabilty: true,
                            no_of_wheelchair: { $gte: booking?.no_of_wheelchair }
                        },
                    }
                    let vehicle_detail: any = await this.model.vehicle_detail.findOne(query).populate([{ path: 'vehicle_id', model: 'Vehicle_types' }])
                    //console.log('vehicle_detail', vehicle_detail)

                    // console.log("**************", driver?._id);
                    //console.log("*******vehicle_detail******",vehicle_detail);

                    driver.vehicle_detail = vehicle_detail || null;
                    if (booking && vehicle_detail) {
                        data.push(driver)
                    }
                }
                const count = await this.model.drivers.countDocuments(query);
                if (driver) {
                    console.log('<---driver--->')
                    data.push(driver);
                }
                return { data, count: driver ? data.length : count };
            }
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async waitingForDriver(payload: DriverIdDto) {
        try {
            const query = {
                booking_status: { $in: [BookingStatus.Request, null] },
                // driver_id: { $exists: false, $eq: null },
                // schedule_date: { $gt: moment().valueOf() },
                schedule_date: { $gt: moment().startOf('day').valueOf() },
                driver_id: null,
                booking_type: [BookingType.Schedule, BookingType.Current, BookingType.Scheduled_draft],
                $or: [
                    { payment_success: true },
                    { dispatcher_id: { $ne: null } },
                    { company_id: { $ne: null } }
                ]
            };
            const options = await this.commonService.set_options_ace(
                payload?.pagination,
                payload?.limit
            );
            const data = await this.model.booking
                .find(query, {}, options)
                .sort({ schedule_date: 1 })
                .populate([
                    { path: "customer_id", select: "name" },
                    { path: "driver_id", select: "name" },
                ]);
            const count = await this.model.booking.countDocuments(query);
            return { data, count };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Booking Activity Logs 
     */

    async get_booking_logs(id: string, payload) {

        const booking_activity: any = await this.activityService.getAllBookingActivities(id);
        return { data: booking_activity };
    }

    async get_booking(id: string, payload) {
        try {
            let user;
            if (payload.scope === "driver") {
                user = await this.model.drivers.findOne({
                    _id: payload.user_id,
                });
            } else if (payload.scope === "customer") {
                user = await this.model.customers.findOne({
                    _id: payload.user_id,
                });
            }
            //<<<<<<<< FETCH BOOKING DETAIL >>>>>>>>>
            const booking: any = await this.model.booking
                .findOne({ _id: new Types.ObjectId(id) })
                .populate([
                    { path: "customer_id" },
                    { path: "driver_id" },
                    { path: "vehicle_id" },
                    { path: "vehicleDetail_id" },
                    { path: "company_id" },
                    { path: 'connection_driver' },
                    { path: 'connection_customer' },
                ]);
            //<<<<<<<< CONVERT THE PRICE DETAIL WITH USER PREFFERED CURRENCY >>>>>>>>>
            if (user?.preferred_currency || "USD" === "USD") {

                if (payload.scope === "driver") {
                    let config: any = await this.model.appConfiguration.findOne();
                    // let calculate_base_fee_for_driver = booking?.base_fee - (booking?.base_fee * user?.commission / 100);
                    let calculate_base_fee_for_driver = booking?.amount_for_driver;
                    let airport_toll = (booking.include_airport_toll) ? config?.airport_toll : 0;
                    const amount_for_driver = calculate_base_fee_for_driver + airport_toll;
                    booking.amount_for_driver = amount_for_driver;
                }
                else {
                    let config: any = await this.model.appConfiguration.findOne();
                    let calculate_base_fee_for_driver = booking?.base_fee - (booking?.base_fee * 12 / 100);
                    let airport_toll = (booking.include_airport_toll) ? config?.airport_toll : 0;
                    const amount_for_driver = calculate_base_fee_for_driver + airport_toll;
                    booking.amount_for_driver = amount_for_driver;
                }

                return { data: booking };
            } else {
                // let convertcurrencydata = {
                //     base_fee: booking.base_fee,
                //     base_fee_with_discount: booking.base_fee_with_discount,
                //     coupon_discount: booking.coupon_discount,
                //     gst: booking.gst,
                //     total_amount: booking.total_amount,
                //     waiting_charge: booking.stop_charges,
                //     tip: booking.tip_driver,
                //     toll_charge: booking.toll_price,
                //     surcharge_amount: booking.surcharge_amount,
                // };

                // const response = await this.convert_currency_get_booking(
                //     user.preferred_currency,
                //     convertcurrencydata
                // );

                const bookingWithConvertedFees = {
                    ...booking._doc,
                    base_fee: booking.base_fee,
                    total_amount: booking.total_amount,
                    gst: booking.gst,
                    coupon_discount: booking.coupon_discount,
                    stop_charges: booking.stop_charges,
                    base_fee_with_discount: booking.base_fee_with_discount,
                    toll_price: booking.toll_price,
                    tip_driver: booking.tip_driver,
                    surcharge_amount: booking.surcharge_amount,
                };

                if (payload.scope === "driver") {
                    let config: any = await this.model.appConfiguration.findOne();
                    let calculate_base_fee_for_driver = booking?.base_fee - (booking?.base_fee * user?.commission / 100);
                    let airport_toll = (booking.include_airport_toll) ? config?.airport_toll : 0;
                    const amount_for_driver = calculate_base_fee_for_driver + airport_toll;
                    bookingWithConvertedFees.amount_for_driver = amount_for_driver;
                } else {
                    let config: any = await this.model.appConfiguration.findOne();
                    let calculate_base_fee_for_driver = booking?.base_fee - (booking?.base_fee * 12 / 100);
                    let airport_toll = (booking.include_airport_toll) ? config?.airport_toll : 0;
                    const amount_for_driver = calculate_base_fee_for_driver + airport_toll;
                    bookingWithConvertedFees.amount_for_driver = amount_for_driver;
                }

                return { data: bookingWithConvertedFees };
            }
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async available_rides(body: CalculateVehiclePriceDto, customer_id) {
        try {
            let additional_fee = 0;
            let toll_charges = 0;
            let pending_booking_amount = 0;
            let user = await this.model.customers.findOne({ _id: customer_id });

            if (user.pending_pay_amount > 0) {
                pending_booking_amount = user.pending_pay_amount;
            }
            // let distanceFromSyndeyAirport = await this.commonService.checkDistancefromSydney(
            //     body.pick_up_lat,
            //     body.pick_up_long
            // );
            let distanceFromSyndeyAirport = 20
            console.log(body.pick_up_lat, 'body.pick_up_lat');
            console.log(body.pick_up_long, 'body.pick_up_long');
            console.log(distanceFromSyndeyAirport, '<---distanceFromSyndeyAirport');

            if (Number(distanceFromSyndeyAirport) > 30) {
                additional_fee = 25;
            }
            console.log(additional_fee, 'additional_fee');

            let distance = await this.commonService.calculateDistanceWithStops(
                body.pick_up_lat,
                body.pick_up_long,
                body.drop_lat,
                body.drop_long,
                body.stops
            );
            console.log(distance, '<----distance')
            const pickup = { lat: body.pick_up_lat, long: body.pick_up_long };
            const dest = { lat: body.drop_lat, long: body.drop_long };

            toll_charges = await this.commonService.calculateTotalTollCharges(
                pickup,
                body.stops,
                dest
            );
            console.log(toll_charges, '<----toll_charges');

            //Available vehicles under 7km radius
            const availableVehicleIds: any = await this.check_rides_under_5km_radius(
                body.pick_up_lat,
                body.pick_up_long,
                body.filter
            );

            const data = await this.calculatePricing(distance, body, toll_charges, additional_fee,
                pending_booking_amount, availableVehicleIds)
            return { data };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }


    async calculatePricing(
        distance,
        body: CalculateVehiclePriceDto,
        toll_charges,
        additional_fee,
        pending_booking_amount?,
        availableVehicleIds?
    ) {
        try {
            console.time('calculatePricing:vehicleFetch');
            let vehicle_detail: any = await this.model.vehicle
                .find({ is_active: true })
                .sort({ passenger: 1 })
                .populate({ path: "vehicle_id" });
            console.timeEnd('calculatePricing:vehicleFetch');

            const vehicleData = [];

            console.time("main loop")
            for (const vehicle of vehicle_detail) {
                console.time(`calculatePricing:${vehicle.vehicle_id?.vehicle_type}`);

                let price: number = 0;

                if (body.no_of_wheelchair) {
                    price += +vehicle.wheel_chair_charges * +body.no_of_wheelchair;
                }
                if (body.no_of_childcapsule) {
                    price += +vehicle?.child_capsule_charges * +body.no_of_childcapsule;
                }
                if (body.no_of_childseat) {
                    price += +vehicle.child_seat_charges * +body.no_of_childseat;
                }

                let distance_price: number = 0;
                for (const priceObj of vehicle?.distance_price) {
                    if (
                        distance > priceObj?.min_range &&
                        (!priceObj?.max_range || distance < priceObj?.max_range)
                    ) {
                        distance_price = priceObj?.price;
                        break;
                    }
                }

                const base_fee_without_addon =
                    distance * distance_price +
                    +vehicle.base_fare +
                    additional_fee +
                    toll_charges;

                const total_km_price = distance * distance_price;
                price += total_km_price;
                price += Number(vehicle.base_fare) + additional_fee + toll_charges;

                console.time(`calculatePricing:checkSurcharge:${vehicle.vehicle_id?.vehicle_type}`);
                const surcharge_valid: any = await this.check_surcharge_date(
                    vehicle.vehicle_id,
                    body.pick_up_lat,
                    body.pick_up_long
                );
                console.timeEnd(`calculatePricing:checkSurcharge:${vehicle.vehicle_id?.vehicle_type}`);

                let config: any = await this.model.appConfiguration.findOne();

                let surcharge_amount: number;
                let tax: number;

                if (surcharge_valid > 1) {
                    const surcharge = price * vehicle.surcharge_price;
                    surcharge_amount = surcharge - price;
                    tax = +(
                        surcharge *
                        (config.tax.tax_percentage / 100)
                    ).toFixed(2);
                } else {
                    tax = +(price * (config?.tax?.tax_percentage / 100)).toFixed(2);
                    surcharge_amount = 0;
                }

                const pendingWaitAmount = pending_booking_amount || 0;
                const totalPrice = price + pendingWaitAmount;

                let isAvailable = false;
                let duration_time = null;

                if (availableVehicleIds) {
                    for (const availableVehicle of availableVehicleIds) {
                        if (
                            availableVehicle.vehicle_id.toString() ===
                            vehicle.vehicle_id._id.toString()
                        ) {
                            isAvailable = true;
                            duration_time = availableVehicle.duration_time;
                        }
                    }
                } else {
                    isAvailable = true;
                    duration_time = vehicle?.duration_time ?? 0;
                }

                const vehicle_type = {
                    _id: vehicle.vehicle_id._id,
                    vehicle_type: vehicle.vehicle_id.name,
                    image: vehicle.vehicle_id.image,
                    __v: 0,
                };

                vehicleData.push({
                    vehicle_id: vehicle_type,
                    vehicle_name: vehicle.vehicle_id.vehicle_type,
                    luggage: vehicle.luggage,
                    passenger: vehicle.passenger,
                    handbags: vehicle.handbags,
                    wheel_chair_charges: vehicle?.wheel_chair_charges,
                    child_seat_charges: vehicle?.child_seat_charges,
                    child_capsule_charges: vehicle?.child_capsule_charges,
                    base_fee: totalPrice,
                    available: isAvailable,
                    duration_time: duration_time,
                    tax_percentage: config?.tax?.tax_percentage,
                    surcharge_amount,
                    base_fee_without_addon,
                    tax,
                    toll_charges: toll_charges,
                    distance,
                    airport_toll: body.include_airport_toll ? config?.airport_toll : 0,
                    gov_levy: config?.gov_levy,
                    no_of_childcapsule: body.no_of_childcapsule || 0
                });

                console.timeEnd(`calculatePricing:${vehicle.vehicle_id?.vehicle_type}`);
            }
            console.timeEnd("main loop")

            return vehicleData;
        } catch (error) {
            console.log(error, '<== from calculatePricing');
            throw error;
        }
    }

    // async calculatePricing(distance, body: CalculateVehiclePriceDto, toll_charges, additional_fee, pending_booking_amount?, availableVehicleIds?) {
    //     try {
    //         console.log(body, '<----payload received');

    //         let price: number;
    //         let vehicle_detail: any = await this.model.vehicle.find({ is_active: true }).sort({ passenger: 1 }).populate({ path: "vehicle_id" });
    //         const vehicleData = []
    //         for (const vehicle of vehicle_detail) {
    //             let price: number = 0
    //             console.log(price, '<----price');
    //             console.log('<---calclation for  ', vehicle.vehicle_id.vehicle_type,);

    //             if (body.no_of_wheelchair) {
    //                 price = price + (+vehicle.wheel_chair_charges * +body.no_of_wheelchair);
    //                 console.log('wheel_chair price added----->');
    //             }
    //             if (body.no_of_childcapsule) {
    //                 price = price + (+vehicle?.child_capsule_charges * +body.no_of_childcapsule);
    //                 console.log('no_of_childcapsule price added------>');
    //             }
    //             if (body.no_of_childseat) {
    //                 price = price + (+vehicle.child_seat_charges * +body.no_of_childseat);
    //                 console.log('child_seat price added------>');
    //             }
    //             console.log(price, '<----before distance');
    //             let distance_price: number = 0;
    //             for (const priceObj of vehicle?.distance_price) {
    //                 if (distance > priceObj?.min_range && (!priceObj?.max_range || distance < priceObj?.max_range)) {
    //                     distance_price = priceObj?.price
    //                     break;
    //                 }
    //             }
    //             const base_fee_without_addon = (distance * distance_price) + +(vehicle.base_fare) + additional_fee + toll_charges
    //             const total_km_price = distance * distance_price
    //             console.log(total_km_price, '<---total_km_price');

    //             price = price + total_km_price
    //             console.log(price, '<---price with distance');

    //             price = price + Number(vehicle.base_fare) + additional_fee + toll_charges
    //             console.log(price, '<------ride_price');
    //             // price = price + (price * vehicle.commission_percentage / 100)
    //             // console.log(price, '<------ride_price added commission');

    //             const surcharge_valid: any = await this.check_surcharge_date(
    //                 vehicle.vehicle_id,
    //                 body.pick_up_lat,
    //                 body.pick_up_long
    //             );
    //             let config: any = await this.model.appConfiguration.findOne();

    //             let surcharge_amount: number
    //             let tax: number
    //             if (surcharge_valid > 1) {
    //                 let surcharge = price * vehicle.surcharge_price;
    //                 surcharge_amount = surcharge - price;
    //                 tax = +(
    //                     surcharge *
    //                     (config.tax.tax_percentage / 100)
    //                 ).toFixed(2);
    //             } else {
    //                 console.log(price, '<---before tax');
    //                 tax = +(price * (config?.tax?.tax_percentage / 100)).toFixed(2);
    //                 surcharge_amount = 0;
    //             }
    //             console.log(tax, '<---tax');
    //             console.log(price, '<--price');
    //             const pendingWaitAmount = (pending_booking_amount) ? pending_booking_amount : 0;
    //             console.log(pendingWaitAmount, '<----pendingWaitAmount');

    //             const totalPrice = (price + pendingWaitAmount);

    //             console.log(price, '<--after ading tax');
    //             console.log(totalPrice, '<--after ading tax');
    //             console.log(vehicle.vehicle_id, '<----vehical type');

    //             let isAvailable = false;
    //             let duration_time = null;
    //             // Check if the vehicle ID exists in availableVehicleIds
    //             if (availableVehicleIds) {
    //                 for (const availableVehicle of availableVehicleIds) {
    //                     if (
    //                         availableVehicle.vehicle_id.toString() ===
    //                         vehicle.vehicle_id._id.toString()
    //                     ) {
    //                         isAvailable = true;
    //                         duration_time = availableVehicle.duration_time;
    //                     }
    //                 }
    //             } else {
    //                 isAvailable = true;
    //                 duration_time = vehicle?.duration_time ?? 0;
    //             }

    //             const vehicle_type = {
    //                 _id: vehicle.vehicle_id._id,
    //                 vehicle_type: vehicle.vehicle_id.name,
    //                 image: vehicle.vehicle_id.image,
    //                 __v: 0,
    //             };
    //             vehicleData.push({
    //                 vehicle_id: vehicle_type,
    //                 vehicle_name: vehicle.vehicle_id.vehicle_type,
    //                 luggage: vehicle.luggage,
    //                 passenger: vehicle.passenger,
    //                 handbags: vehicle.handbags,
    //                 wheel_chair_charges: /* vehicle?.wheel_chair_charges * body?.no_of_wheelchair ||  */vehicle?.wheel_chair_charges,
    //                 child_seat_charges: /* vehicle?.child_seat_charges * body?.no_of_childseat ||  */vehicle?.child_seat_charges,
    //                 child_capsule_charges: /* vehicle?.child_capsule_charges * body?.no_of_childcapsule ||  */vehicle?.child_capsule_charges,
    //                 base_fee: totalPrice,
    //                 available: isAvailable,
    //                 duration_time: duration_time,
    //                 tax_percentage: config?.tax?.tax_percentage,
    //                 surcharge_amount,
    //                 base_fee_without_addon,
    //                 tax,
    //                 toll_charges: toll_charges,
    //                 distance,
    //                 airport_toll: (body.include_airport_toll) ? config?.airport_toll : 0,
    //                 gov_levy: config?.gov_levy,
    //                 no_of_childcapsule: body.no_of_childcapsule || 0
    //             });
    //             console.log('*********************************************************');

    //         }
    //         console.log(vehicleData, '<-----vehicleData');

    //         return vehicleData
    //     } catch (error) {
    //         console.log(error, '<==from calculatePricing');
    //         throw error
    //     }
    // }

    async calculatePricingAtPay(
        distance,
        body,
        toll_charges,
        additional_fee,
        pending_booking_amount,
        user_id
    ) {
        try {
            console.time('calculatePricingAtPay:vehicleFetch');
            const vehicle: any = await this.model.vehicle
                .findOne({ vehicle_id: body.vehicle_id, is_active: true })
                .populate({ path: "vehicle_id" });
            console.timeEnd('calculatePricingAtPay:vehicleFetch');

            let price: number = 0;
            let coupon_price: number = 0;

            if (body.no_of_wheelchair) {
                price += +vehicle.wheel_chair_charges * +body.no_of_wheelchair;
            }
            if (body.no_of_childcapsule) {
                price += +vehicle.child_capsule_charges * +body.no_of_childcapsule;
            }
            if (body.no_of_childseat) {
                price += +vehicle.child_seat_charges * +body.no_of_childseat;
            }

            let distance_price: number = 0;
            for (const priceObj of vehicle?.distance_price) {
                if (
                    distance > priceObj?.min_range &&
                    (!priceObj?.max_range || distance < priceObj?.max_range)
                ) {
                    distance_price = priceObj?.price;
                    break;
                }
            }

            const total_km_price = distance * distance_price;
            price += total_km_price;
            price += Number(vehicle.base_fare) + additional_fee + toll_charges;

            const base_fee_without_addon =
                distance * distance_price +
                +vehicle.base_fare +
                additional_fee +
                toll_charges;

            console.time('calculatePricingAtPay:configFetch');
            const config: any = await this.model.appConfiguration.findOne();
            console.timeEnd('calculatePricingAtPay:configFetch');

            console.time('calculatePricingAtPay:surchargeCheck');
            const surcharge_valid: any = await this.check_surcharge_date(
                vehicle.vehicle_id,
                body.pick_up_lat,
                body.pick_up_long
            );
            console.timeEnd('calculatePricingAtPay:surchargeCheck');

            let surcharge_amount: number;
            let tax: number;
            let base_fee_discount = 0;

            if (body.coupon_id) {
                console.time('calculatePricingAtPay:couponCalc');
                coupon_price = await this.calculate_coupon_discount(
                    body.coupon_id,
                    price,
                    user_id,
                    surcharge_amount
                );
                console.timeEnd('calculatePricingAtPay:couponCalc');

                base_fee_discount = price - coupon_price;
                price = base_fee_discount;
            }

            if (surcharge_valid > 1) {
                const surcharge = price * vehicle.surcharge_price;
                surcharge_amount = surcharge - price;
                price = surcharge;
                tax = +(
                    surcharge *
                    (config.tax.tax_percentage / 100)
                ).toFixed(2);
            } else {
                tax = +(
                    price *
                    (config?.tax?.tax_percentage / 100)
                ).toFixed(2);
                surcharge_amount = 0;
            }

            price += pending_booking_amount ?? 0;

            const airport_toll = body?.include_airport_toll === true ? config?.airport_toll : 0;
            const total = +(price + tax + config?.gov_levy + airport_toll).toFixed(2);

            const data = {
                gst_amount: tax,
                coupan_discount_amount: base_fee_discount,
                total_amount: total,
                total_trip_amount: total,
                base_fee: price,
                base_fee_without_addon,
                surcharge_amount,
                child_seat_charge: body.no_of_childseat
                    ? vehicle.child_seat_charges * +body.no_of_childseat
                    : 0,
                wheel_chair_charge: body.no_of_wheelchair
                    ? vehicle.wheel_chair_charges * +body.no_of_wheelchair
                    : 0,
                child_capsule_charge: body.no_of_childcapsule
                    ? vehicle.child_capsule_charges * +body.no_of_childcapsule
                    : 0,
                pending_booking_amount: pending_booking_amount ?? 0,
                coupon_price,
                no_of_childseat: body.no_of_childseat,
                no_of_wheelchair: body.no_of_wheelchair,
                no_of_childcapsule: body.no_of_childcapsule,
                airport_toll,
                gov_levy: config?.gov_levy,
            };

            return data;
        } catch (error) {
            console.log(error, '<== from calculatePricingAtPay');
            throw error;
        }
    }

    // async calculatePricingAtPay(distance, body, toll_charges, additional_fee, pending_booking_amount, user_id) {
    //     try {
    //         console.log(distance, '<----distance');

    //         let price: number = 0
    //         let coupon_price: number = 0
    //         let vehicle: any = await this.model.vehicle
    //             .findOne({ vehicle_id: body.vehicle_id, is_active: true })
    //             .populate({ path: "vehicle_id" });
    //         console.log(vehicle, '<----vehicle');

    //         if (body.no_of_wheelchair) {
    //             price = price + (+vehicle.wheel_chair_charges * +body.no_of_wheelchair);
    //             console.log('wheel_chair price added----->');
    //         }
    //         if (body.no_of_childcapsule) {
    //             price = price + (+vehicle.child_capsule_charges * +body.no_of_childcapsule);
    //             console.log('no_of_childcapsule price added------>');
    //         }
    //         if (body.no_of_childseat) {
    //             price = price + (+vehicle.child_seat_charges * +body.no_of_childseat);
    //             console.log('child_seat price added------>');
    //         }
    //         let distance_price: number = 0;
    //         for (const priceObj of vehicle?.distance_price) {
    //             if (distance > priceObj?.min_range && (!priceObj?.max_range || distance < priceObj?.max_range)) {
    //                 distance_price = priceObj?.price
    //                 break;
    //             }
    //         }
    //         console.log(distance_price, '<----distance_price as per range');

    //         const total_km_price = distance * distance_price
    //         price = price + total_km_price

    //         console.log(vehicle, '<----vehicle');
    //         console.log(vehicle.base_fare, '<----vehicle.base_fare');

    //         price = price + Number(vehicle.base_fare) + additional_fee + toll_charges

    //         // only to show without addon
    //         const base_fee_without_addon = (distance * distance_price) + +(vehicle.base_fare) + additional_fee + toll_charges
    //         console.log(base_fee_without_addon, '<----base_fee_without_addon');

    //         console.log(price, '<------ride_price');

    //         const surcharge_valid: any = await this.check_surcharge_date(
    //             vehicle.vehicle_id,
    //             body.pick_up_lat,
    //             body.pick_up_long
    //         );
    //         let config: any = await this.model.appConfiguration.findOne();

    //         let surcharge_amount: number
    //         let tax: number
    //         let base_fee_discount = 0
    //         if (body.coupon_id) {
    //             coupon_price = await this.calculate_coupon_discount(
    //                 body.coupon_id,
    //                 price,
    //                 user_id,
    //                 surcharge_amount
    //             );
    //             base_fee_discount = price - coupon_price;
    //             price = base_fee_discount
    //         }
    //         if (surcharge_valid > 1) {
    //             let surcharge = price * vehicle.surcharge_price;
    //             surcharge_amount = surcharge - price;
    //             price = surcharge
    //             tax = +(
    //                 surcharge *
    //                 (config.tax.tax_percentage / 100)
    //             ).toFixed(2);
    //         } else {
    //             console.log(price, '<---before tax');
    //             tax = +(
    //                 price *
    //                 (config?.tax?.tax_percentage / 100)
    //             ).toFixed(2);
    //             surcharge_amount = 0;
    //         }
    //         console.log(tax, '<---tax');
    //         console.log(coupon_price, '<---discounted price');

    //         price = (price + pending_booking_amount);

    //         console.log(price, '<--after ading tax and base_fee_discount');
    //         console.log(vehicle.vehicle_id, '<----vehical type');
    //         console.log(body.include_airport_toll, 'body?.include_airport_toll');
    //         const airport_toll = body?.include_airport_toll === true ? config?.airport_toll : 0;
    //         let data = {
    //             gst_amount: tax,
    //             coupan_discount_amount: base_fee_discount,
    //             total_amount: +(price + tax + config?.gov_levy + airport_toll).toFixed(2),
    //             total_trip_amount: +(price + tax + config?.gov_levy + airport_toll).toFixed(2),
    //             base_fee: price,
    //             base_fee_without_addon,
    //             surcharge_amount,
    //             child_seat_charge: (body.no_of_childseat) ? vehicle.child_seat_charges * +body.no_of_childseat : 0,
    //             wheel_chair_charge: (body.no_of_wheelchair) ? vehicle.wheel_chair_charges * +body.no_of_wheelchair : 0,
    //             child_capsule_charge: (body.no_of_childcapsule) ? vehicle.child_capsule_charges * +body.no_of_childcapsule : 0,
    //             pending_booking_amount: pending_booking_amount ?? 0,
    //             coupon_price,
    //             no_of_childseat: body.no_of_childseat,
    //             no_of_wheelchair: body.no_of_wheelchair,
    //             no_of_childcapsule: body.no_of_childcapsule,
    //             airport_toll,
    //             gov_levy: config?.gov_levy
    //         };

    //         console.log(data, '<-----data');

    //         return data
    //     } catch (error) {
    //         console.log(error, '<==from calculatePricing');
    //         throw error
    //     }
    // }


    async webAppVehiclePricing(body: CalculateVehiclePriceDto) {
        try {
            let additional_fee = 0;
            let distance;
            let toll_charges = 0;

            if (
                body.pick_up_lat &&
                body.pick_up_long &&
                body.drop_lat &&
                body.drop_long
            ) {
                // ⏱️ Time checkDistancefromSydney
                console.time('checkDistancefromSydney');
                let distanceFromSyndeyAirport =
                    await this.commonService.checkDistancefromSydney(
                        body.pick_up_lat,
                        body.pick_up_long
                    );
                console.timeEnd('checkDistancefromSydney');

                if (Number(distanceFromSyndeyAirport) > 30) {
                    additional_fee = 25;
                }

                // ⏱️ Time calculateDistanceWithStops
                console.time('calculateDistanceWithStops');
                distance = await this.commonService.calculateDistanceWithStops(
                    body.pick_up_lat,
                    body.pick_up_long,
                    body.drop_lat,
                    body.drop_long,
                    body.stops
                );
                console.timeEnd('calculateDistanceWithStops');

                const pickup = {
                    lat: body.pick_up_lat,
                    long: body.pick_up_long,
                };
                const dest = { lat: body.drop_lat, long: body.drop_long };

                // ⏱️ Time calculateTotalTollCharges
                console.time('calculateTotalTollCharges');
                toll_charges = await this.commonService.calculateTotalTollCharges(
                    pickup,
                    body.stops,
                    dest
                );
                console.timeEnd('calculateTotalTollCharges');
            } else {
                distance = 0;
            }

            // ⏱️ Time calculatePricing
            console.time('calculatePricing');
            const vehicleData = await this.calculatePricing(
                distance,
                body,
                toll_charges,
                additional_fee
            );
            console.timeEnd('calculatePricing');

            return { data: vehicleData };
        } catch (error) {
            console.log("error", error); // Keep this for error tracing
            throw error;
        }
    }


    // async webAppVehiclePricing(body: CalculateVehiclePriceDto) {
    //     try {
    //         let additional_fee = 0;
    //         let distance;
    //         let toll_charges = 0

    //         if (
    //             body.pick_up_lat &&
    //             body.pick_up_long &&
    //             body.drop_lat &&
    //             body.drop_long
    //         ) {
    //             let distanceFromSyndeyAirport =
    //                 await this.commonService.checkDistancefromSydney(
    //                     body.pick_up_lat,
    //                     body.pick_up_long
    //                 );
    //             console.log('distanceFromSyndeyAirport', distanceFromSyndeyAirport)
    //             if (Number(distanceFromSyndeyAirport) > 30) {
    //                 additional_fee = 25;
    //                 console.log('apply ', additional_fee)
    //             }
    //             distance = await this.commonService.calculateDistanceWithStops(
    //                 body.pick_up_lat,
    //                 body.pick_up_long,
    //                 body.drop_lat,
    //                 body.drop_long,
    //                 body.stops
    //             );
    //             const pickup = {
    //                 lat: body.pick_up_lat,
    //                 long: body.pick_up_long,
    //             };
    //             const dest = { lat: body.drop_lat, long: body.drop_long };

    //             toll_charges =
    //                 await this.commonService.calculateTotalTollCharges(
    //                     pickup,
    //                     body.stops,
    //                     dest
    //                 );
    //         } else {
    //             distance = 0;
    //         }
    //         console.log('toll_charges', toll_charges)
    //         const vehicleData = await this.calculatePricing(distance, body, toll_charges, additional_fee)
    //         return { data: vehicleData };
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    async availableRides(body: CalculateVehiclePriceDto) {
        try {
            let distance = await this.commonService.calculateDistanceWithStops(
                body.pick_up_lat,
                body.pick_up_long,
                body.drop_lat,
                body.drop_long,
                body.stops
            );
            const availableVehicleIds: any = await this.check_rides_under_5km_radius(
                body.pick_up_lat,
                body.pick_up_long,
                body.filter
            );
            let vehicle_detail: any = await this.model.vehicle
                .find({ is_active: true }, {}, { sort: { passenger: 1 } })
                .populate({ path: "vehicle_id" });
            const vehicleData: any[] = [];
            let surcharge_amount;
            let tax;
            let tax_with_conversion;
            let surcharge_amount_with_conversion;
            let config: any = await this.model.appConfiguration.findOne();
            let base_fee;
            let vehicle_name_with_localization;
            for (const vehicle of vehicle_detail) {
                const total_km_price = Math.round(
                    distance * vehicle.distance_price
                );

                const ride_base_fee =
                    Number(vehicle.base_fare) + Number(total_km_price);
                const surcharge_valid: any = await this.check_surcharge_date(
                    vehicle.vehicle_id,
                    body.pick_up_lat,
                    body.pick_up_long
                );
                if (surcharge_valid > 1) {
                    let surcharge = ride_base_fee * vehicle.surcharge_price;
                    surcharge_amount = surcharge - ride_base_fee;
                    tax = (
                        surcharge *
                        (config.tax.tax_percentage / 100)
                    ).toFixed(2);
                } else {
                    tax = (
                        ride_base_fee *
                        (config?.tax?.tax_percentage / 100)
                    ).toFixed(2);
                    surcharge_amount = 0;
                }

                let data = {
                    base_fee: ride_base_fee,
                    gst: tax,
                    coupon_discount: surcharge_amount,
                };
                // let response = await this.convert_currency(
                //     "USD", // user.preferred_currency,
                //     data
                // );
                base_fee = ride_base_fee;
                surcharge_amount_with_conversion = surcharge_amount
                tax_with_conversion = tax;
                let isAvailable = false;
                let duration_time = null;
                // Check if the vehicle ID exists in availableVehicleIds
                for (const availableVehicle of availableVehicleIds) {
                    if (
                        availableVehicle?.vehicle_id.toString() ===
                        vehicle?.vehicle_id?._id.toString()
                    ) {
                        isAvailable = true;
                        duration_time = availableVehicle?.duration_time;
                    }
                }

                vehicle_name_with_localization =
                    await this.commonService.localization(
                        "english",
                        vehicle?.vehicle_id?.vehicle_type
                    );
                // console.log(vehicle_name_with_localization, "<---vehicle_name_with_localization");

                const vehicle_type = {
                    _id: vehicle?.vehicle_id?._id,
                    // vehicle_type: vehicle_name_with_localization["english"],
                    image: vehicle.vehicle_id?.image,
                    __v: 0,
                };
                vehicleData.push({
                    vehicle_id: vehicle_type,
                    vehicle_name: vehicle?.vehicle_id?.vehicle_type,
                    base_fee: base_fee,
                    available: isAvailable,
                    duration_time: duration_time,
                    surcharge_amount: surcharge_amount_with_conversion,
                    tax: tax_with_conversion,
                });
            }
            return vehicleData;
        } catch (error) {
            console.log(error, "<-------avalaible rides");
            throw error;
        }
    }

    async available_coupons(body, user_id) {
        try {
            let amount = body.amount;
            const customer = await this.model.customers.findOne({
                _id: user_id,
            });
            const today = new Date().getTime();
            // if (customer?.preferred_currency === "INR") {
            //     amount = await this.convert_payment_amount(
            //         customer.preferred_currency,
            //         body.amount
            //     );
            // } else {
            //     amount = body.amount;
            // }

            // Find coupons where amount is less than the provided amount and expiry date is equal to or in the past of today's date
            const availableCoupons: any = await this.model.coupons.find({
                type: "in-app",
                minimum_booking_amount: { $lte: amount },
                valid_upto: { $gte: today },
                status: "active",
            });

            // const convertedDataPromises = availableCoupons.map(
            //     async (entry) => {
            //         const response = await this.convert_coupon_amount(
            //             customer?.preferred_currency ?? "USD",
            //             entry.maximum_discount_amount,
            //             entry.minimum_booking_amount
            //         );

            //         return {
            //             ...entry._doc,
            //             maximum_discount_amount:
            //                 entry.maximum_discount_amount,
            //             minimum_booking_amount: entry.minimum_booking_amount,
            //         };
            //     }
            // );

            // const convertedData = await Promise.all(convertedDataPromises);
            if (body.search) {
                // Create a case-insensitive regular expression for the search term
                const regex = new RegExp(body.search, "i");
                return availableCoupons.filter((coupon) =>
                    regex.test(coupon.code)
                );
            }

            return availableCoupons;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async ApplyPromoCode(promo_code, req, customer_id) {
        try {
            let language = req.headers["language"] || "english";
            const key = "Invalid_promo_code";
            const localization = await this.commonService.localization(
                language,
                key
            );
            const customer = await this.model.customers.findOne({
                _id: customer_id,
            });
            const find_this_promo_code: any = await this.model.coupons.findOne({
                code: promo_code,
                type: "one-time",
                used_by: [],
                // used_by: { $nin: [customer_id] },
            });
            if (find_this_promo_code) {
                if (find_this_promo_code.status === "active") {
                    // const response = await this.convert_wallet_amount(
                    //     customer?.preferred_currency || "USD",
                    //     find_this_promo_code.maximum_discount_amount
                    // );
                    // find_this_promo_code.maximum_discount_amount = response;
                    return { data: find_this_promo_code };
                } else {
                    throw new HttpException(
                        {
                            error_code:
                                "currently this coupon is deactivate by admin",
                            error_description:
                                "currently this coupon is deactivate by admin",
                        },
                        HttpStatus.BAD_REQUEST
                    );
                }
            } else {
                throw new HttpException(
                    {
                        error_code: localization[language],
                        error_description: localization[language],
                    },
                    HttpStatus.BAD_REQUEST
                );
            }
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }


    async accept_booking(booking_id, driver_id) {
        try {
            // STEP 1: Validate driver has vehicle FIRST (before locking)
            const driver_vehicle_detail = await this.model.vehicle_detail.findOne({
                driver_id: driver_id,
                status: "active",
            });
    
            if (!driver_vehicle_detail) {
                this.activityService.logActivity({
                    booking_id: booking_id.toString(),
                    userId: driver_id,
                    action: "DRIVER_ACCEPT_CASE",
                    resource: "booking",
                    description: "You have no active vehicle. Please set vehicle details.",
                    payload: { driver_id: driver_id }
                });
    
                throw new HttpException(
                    {
                        error_code: "You have no active vehicle. Please set vehicle details.",
                        error_description: "You have no active vehicle. Please set vehicle details.",
                    },
                    HttpStatus.BAD_REQUEST
                );
            }
    
            // STEP 2: ATOMIC LOCK - Try to claim the booking
            // Only lock AFTER validating the driver is eligible
            const lockResult = await this.model.booking.updateOne(
                {
                    _id: booking_id,
                    booking_status: { $nin: [BookingStatus.Accept, BookingStatus.Cancelled, BookingStatus.Failed] },
                    driver_id: null  // Ensure no driver is assigned yet
                },
                {
                    $set: { 
                        driver_id: driver_id,
                        booking_status: BookingStatus.Accept,
                        accept_ride_at: moment().valueOf()
                    }
                }
            );
    
            // If modifiedCount is 0, another driver already accepted it
            if (lockResult.modifiedCount === 0) {
                // Check current status to give better error message
                const current_booking = await this.model.booking.findById(booking_id);
                
                let error_message = "This ride is no longer available as the ride has already been assigned to another driver.";
                
                if (current_booking?.booking_status === BookingStatus.Cancelled || 
                    current_booking?.booking_status === BookingStatus.Failed) {
                    error_message = "Booking already cancelled";
                }
    
                this.activityService.logActivity({
                    booking_id: booking_id.toString(),
                    userId: driver_id,
                    action: "DRIVER_ACCEPT_CASE",
                    resource: "booking",
                    description: error_message,
                    payload: { driver_id: driver_id }
                });
    
                throw new HttpException(
                    {
                        error_code: "Booking already accepted",
                        error_description: error_message,
                    },
                    HttpStatus.BAD_REQUEST
                );
            }
    
            // STEP 3: Booking is locked successfully, continue with acceptance
            const booking_data: any = await this.find_booking_with_id(booking_id);
    
            // STEP 4: Emit socket event
            let socket_data = await this.socket_booking_accepted(String(booking_id));
            console.log(socket_data, '<----from socket_booking_accepted');
    
            const { socketIds, booking_details }: any = socket_data;
            console.log("INSIDE --- accept_booking socketIds", socketIds);
            socketIds.forEach((socketId) => {
                this.server.to(socketId).emit("socket_booking_accepted", { booking: booking_details });
            });
    
            // STEP 5: Update driver status
            let driver_update_data = {
                ride_status: ride_status.busy,
                current_booking: booking_id,
                currently_send_ride_request: false,
                currently_send_ride_request_id: null,
                currently_send_ride_request_generate_at: null
            };
    
            let config: any = await this.model.appConfiguration.findOne();
            const driver = await this.model.drivers.findOneAndUpdate(
                { _id: driver_id },
                driver_update_data,
                { new: true }
            );
    
            // STEP 6: Calculate earnings
            const app_earning = (booking_data.total_amount * driver?.commission / 100) + booking_data?.gst;
            let calculate_base_fee_for_driver = booking_data?.amount_for_driver;
            let airport_toll = (booking_data.include_airport_toll) ? config?.airport_toll : 0;
            const amount_for_driver = calculate_base_fee_for_driver + airport_toll;
    
            // STEP 7: Update booking with remaining details
            let update_data = {
                vehicleDetail_id: driver_vehicle_detail._id,
                is_ride_started: (booking_data.booking_type === BookingType.Schedule) ? false : true,
                amount_for_driver,
                app_earning
            };
    
            await this.update_booking_with_id(booking_id, update_data);
    
            // STEP 8: Create declined booking record
            await this.model.declined_bookings.create({
                booking_id: booking_id,
                driver_id: driver_id,
                status: "accepted",
            });
    
            // STEP 9: Clear ride request for all other drivers
            await this.model.drivers.updateMany(
                {
                    currently_send_ride_request_id: new Types.ObjectId(booking_id),
                    _id: { $ne: driver_id } // Don't update the driver who accepted
                },
                {
                    $set: {
                        currently_send_ride_request: false,
                        currently_send_ride_request_id: null,
                        currently_send_ride_request_generate_at: null
                    }
                }
            );
    
            // STEP 10: Log activity
            this.activityService.logActivity({
                booking_id: booking_id.toString(),
                userId: driver_id,
                action: "DRIVER_ACCEPT",
                resource: "booking",
                description: "Booking Accepted - by " + driver?.name,
                payload: { driver_id: driver_id }
            });
    
            // STEP 11: Update customer and send notifications
            if (booking_data.customer_id) {
                let customer: any = await this.model.customers.findOne({
                    _id: booking_data.customer_id,
                });
    
                const diff = moment(booking_data?.schedule_date).diff(+new Date(), "minutes");
                console.log(diff, '<---- time diff of booking');
    
                if (!booking_data.schedule_date || diff <= 30) {
                    customer.current_booking = booking_id;
                    customer.save();
                }
    
                const fcm_token = await this.fetch_fcm_token(booking_data.customer_id);
                let key_1, key_2;
    
                if (booking_data.request_type === RequestType.Parcel) {
                    key_1 = "accept_booking_title_for_parcel";
                    key_2 = "accept_booking_description_for_parcel";
                } else {
                    key_1 = "accept_booking_title";
                    key_2 = "accept_booking_description";
                }
    
                const accept_title = await this.commonService.localization(
                    customer?.preferred_language || "english",
                    key_1
                );
                const accept_description = await this.commonService.localization(
                    customer?.preferred_language || "english",
                    key_2
                );
    
                const booking = await this.model.booking.findOne({
                    _id: booking_data._id,
                });
    
                for (const fcmTokens of fcm_token) {
                    let pushData = {
                        title: accept_title[customer?.preferred_language || "english"],
                        message: accept_description[customer?.preferred_language || "english"],
                    };
                    let data_push = {
                        type: "accept_request",
                        booking: booking,
                    };
                    try {
                        await this.notification.send_notification(
                            pushData,
                            fcmTokens.fcm_token,
                            data_push
                        );
                    } catch (error) {
                        console.log(error, "notification fail---->");
                    }
                }
            }
    
            // STEP 12: Fetch and return final booking data
            const data = await this.model.booking
                .findById({ _id: booking_id })
                .populate([{ path: "driver_id" }, { path: "vehicle_id" }]);
    
            return { data: data };
    
        } catch (error) {
            console.log("Error:", error);
            throw error;
        }
    }


    //old
    // async accept_booking(booking_id, driver_id) {
    //     try {
    //         const booking_data: any = await this.find_booking_with_id(booking_id);
    //         const driver_vehicle_detail = await this.model.vehicle_detail.findOne({
    //             driver_id: driver_id,
    //             status: "active",
    //         });

    //         if (booking_data.booking_status === BookingStatus.Accept) {

    //             // create booking Activity

    //             this.activityService.logActivity({
    //                 booking_id: booking_id.toString(),
    //                 userId: driver_id,
    //                 action: "DRIVER_ACCEPT_CASE",
    //                 resource: "booking",
    //                 description: "Booking already accepted - This ride is no longer available as the ride has already been assigned to another driver.",
    //                 payload: { driver_id: driver_id }
    //             });
    //             // end 

    //             throw new HttpException(
    //                 {
    //                     error_code: "Booking already accepted",
    //                     error_description: "This ride is no longer available as the ride has already been assigned to another driver.",
    //                 },
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         if (!driver_vehicle_detail) {

    //             // create booking Activity
    //             this.activityService.logActivity({
    //                 booking_id: booking_id.toString(),
    //                 userId: driver_id,
    //                 action: "DRIVER_ACCEPT_CASE",
    //                 resource: "booking",
    //                 description: "You have no active vehicle. Please set vehicle details.",
    //                 payload: { driver_id: driver_id }
    //             });
    //             // end 

    //             throw new HttpException(
    //                 {
    //                     error_code:
    //                         "You have no active vehicle. Please set vehicle details.",
    //                     error_description:
    //                         "You have no active vehicle. Please set vehicle details.",
    //                 },
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         if (booking_data.booking_status == BookingStatus.Cancelled || booking_data.booking_status === BookingStatus.Failed) {
    //             console.log(
    //                 "Cancelled condition met. Booking data:",
    //                 booking_data
    //             );

    //             // create booking Activity

    //             this.activityService.logActivity({
    //                 booking_id: booking_id.toString(),
    //                 userId: driver_id,
    //                 action: "DRIVER_ACCEPT_CASE",
    //                 resource: "booking",
    //                 description: "Booking already " + BookingStatus.Cancelled,
    //                 payload: { driver_id: driver_id }
    //             });
    //             // end 

    //             try {
    //                 this.model.drivers.updateMany({
    //                     currently_send_ride_request_id: new Types.ObjectId(booking_id)
    //                 }, {
    //                     $set: {
    //                         // currently_send_ride_request_id: null,
    //                         currently_send_ride_request: false,
    //                         currently_send_ride_request_generate_at: null
    //                     }
    //                 })
    //             } catch (error) {
    //                 console.log(error, '<---------------masrk as free all drivers ');

    //             }
    //             throw new HttpException(
    //                 {
    //                     error_code: "already_cancelled",
    //                     error_description: "already_cancelled",
    //                 },
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         let socket_data = await this.socket_booking_accepted(String(booking_id))
    //         console.log(socket_data, '<----from socket_booking_accepted');

    //         const { socketIds, booking_details }: any = socket_data
    //         console.log("INSIDE --- accept_booking socketIds", socketIds)
    //         socketIds.forEach((socketId) => {
    //             this.server.to(socketId).emit("socket_booking_accepted", { booking: booking_details });
    //         });


    //         let driver_update_data = {
    //             ride_status: ride_status.busy,
    //             current_booking: booking_id,
    //             currently_send_ride_request: false,
    //             currently_send_ride_request_id: null,
    //             currently_send_ride_request_generate_at: null
    //         };
    //         let config: any = await this.model.appConfiguration.findOne();

    //         const driver = await this.model.drivers.findOneAndUpdate({ _id: driver_id }, driver_update_data, { new: true });

    //         const app_earning = (booking_data.total_amount * driver?.commission / 100) + booking_data?.gst
    //         // const amount_for_driver = booking_data?.total_amount - app_earning
    //         // let calculate_base_fee_for_driver = booking_data?.base_fee - (booking_data?.base_fee * driver?.commission / 100);
    //         let calculate_base_fee_for_driver = booking_data?.amount_for_driver;
    //         let airport_toll = (booking_data.include_airport_toll) ? config?.airport_toll : 0;
    //         const amount_for_driver = calculate_base_fee_for_driver + airport_toll
    //         let update_data = {
    //             driver_id: driver_id,
    //             booking_status: BookingStatus.Accept,
    //             vehicleDetail_id: driver_vehicle_detail._id,
    //             is_ride_started: (booking_data.booking_type === BookingType.Schedule) ? false : true,
    //             accept_ride_at: moment().valueOf(),
    //             amount_for_driver, app_earning
    //         };

    //         await this.update_booking_with_id(booking_id, update_data);

    //         await this.model.declined_bookings.create({
    //             booking_id: booking_id,
    //             driver_id: driver_id,
    //             status: "accepted",
    //         });

    //         await this.model.drivers.updateMany({
    //             currently_send_ride_request_id: new Types.ObjectId(booking_id)
    //         }, {
    //             $set: {
    //                 // currently_send_ride_request_id: null,
    //                 currently_send_ride_request: false,
    //                 currently_send_ride_request_id: null,
    //                 currently_send_ride_request_generate_at: null
    //             }
    //         })

    //         // create booking Activity

    //         this.activityService.logActivity({
    //             booking_id: booking_id.toString(),
    //             userId: driver_id,
    //             action: "DRIVER_ACCEPT",
    //             resource: "booking",
    //             description: "Booking Accepted - by " + driver?.name,
    //             payload: { driver_id: driver_id }
    //         });

    //         // end 

    //         if (booking_data.customer_id) {
    //             let customer: any = await this.model.customers.findOne({
    //                 _id: booking_data.customer_id,
    //             });
    //             const diff = moment(booking_data?.schedule_date).diff(+new Date(), "minutes");
    //             console.log(diff, '<---- time diff of booking');

    //             if (!booking_data.schedule_date || diff <= 30) {
    //                 customer.current_booking = booking_id;
    //                 customer.save();
    //             }
    //             const fcm_token = await this.fetch_fcm_token(
    //                 booking_data.customer_id
    //             );
    //             let key_1;
    //             let key_2;
    //             if (booking_data.request_type === RequestType.Parcel) {
    //                 key_1 = "accept_booking_title_for_parcel";
    //                 key_2 = "accept_booking_description_for_parcel";
    //             } else {
    //                 key_1 = "accept_booking_title";
    //                 key_2 = "accept_booking_description";
    //             }
    //             const accept_title = await this.commonService.localization(
    //                 customer?.preferred_language || "english",
    //                 key_1
    //             );
    //             const accept_description =
    //                 await this.commonService.localization(
    //                     customer?.preferred_language || "english",
    //                     key_2
    //                 );

    //             const booking = await this.model.booking.findOne({
    //                 _id: booking_data._id,
    //             });

    //             for (const fcmTokens of fcm_token) {
    //                 let pushData = {
    //                     title: accept_title[
    //                         customer?.preferred_language || "english"
    //                     ],
    //                     message:
    //                         accept_description[
    //                         customer?.preferred_language || "english"
    //                         ],
    //                 };
    //                 let data_push = {
    //                     type: "accept_request",
    //                     booking: booking,
    //                 };
    //                 try {
    //                     await this.notification.send_notification(
    //                         pushData,
    //                         fcmTokens.fcm_token,
    //                         data_push
    //                     );
    //                 } catch (error) {
    //                     console.log(error, "notificaiton fail---->");

    //                 }

    //             }
    //         }
    //         const data = await this.model.booking
    //             .findById({ _id: booking_id })
    //             .populate([{ path: "driver_id" }, { path: "vehicle_id" }]);

    //         return { data: data };
    //     } catch (error) {
    //         console.log("Error:", error);
    //         throw error;
    //     }
    // }

    async decline_booking(booking_id: string, driver_id: string) {
        try {
            const declines = await this.model.declined_bookings.create({
                booking_id: booking_id,
                driver_id: driver_id,
                status: "decline",
            });
            console.log(declines, '<-------declines');




            const driver = await this.model.drivers.findOneAndUpdate({ _id: driver_id }, {
                currently_send_ride_request: false,
                currently_send_ride_request_id: null,
                currently_send_ride_request_generate_at: null
            })

            //const temp_data = await this.model.booking.findOne({ _id: booking_id,booking_status: { $nin: [BookingStatus.Failed, BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.Ongoing, BookingStatus.Accept] } }, { driver_id: 1 }, { lean: true });

            const temp_data = await this.model.booking
                .findOne(
                    {
                        _id: booking_id,
                        booking_status: {
                            $nin: [
                                BookingStatus.Failed,
                                BookingStatus.Completed,
                                BookingStatus.Cancelled,
                                BookingStatus.Ongoing,
                                BookingStatus.Accept,
                            ],
                        },
                    },
                    { driver_id: 1 }
                )
                .lean();
            // if (temp_data && temp_data?.driver_id && (String(temp_data.driver_id) == String(driver_id))) {

            if (temp_data) {

                await this.model.booking.findOneAndUpdate(
                    { _id: booking_id },
                    {
                        booking_status: BookingStatus.Request,
                        driver_id: (String(temp_data.driver_id) == String(driver_id)) ? null : temp_data.driver_id,
                        sent_dispatch_noti: false,
                    },
                    { new: true }
                );
            }

            // }

            console.log(driver, '<-------driver');

            // create booking Activity

            this.activityService.logActivity({
                booking_id: booking_id.toString(),
                userId: driver_id,
                action: "DRIVER_DECLINE",
                resource: "booking",
                description: "Booking Declined - by " + driver?.name,
                payload: { driver_id: driver_id }
            });
            // end 

            return { message: "booking declined successfully" };
        } catch (error) {
            console.log("error", error);
        }
    }

    async RideStatus(body) {
        try {
            let data = {};
            let arrived_at_stop_1;
            let arrived_at_stop_2;
            let started_from_stop_1;
            let started_from_stop_2;
            let start_ride_at;
            let arrived_pickup_loc_at;

            const booking_data: any = await this.find_booking_with_id(
                body.booking_id
            );

            await this.model.drivers.findOne({
                _id: booking_data.driver_id,
            });



            if (
                body.status === "reached_at_stop_1" ||
                body.status === "reached_at_stop_2" ||
                body.status === "started_from_Stop_1" ||
                body.status === "started_from_Stop_2" ||
                body.status === "start_ride" ||
                body.status === "reached_at_pickup"
            ) {
                if (body.status === "start_ride") {
                    if (!booking_data.company_id) {
                        if (body.otp == booking_data.ride_otp) {
                            start_ride_at = Date.now();
                        } else {
                            let key = "wrong_booking_otp";
                            const wrong_otp =
                                await this.commonService.localization(
                                    booking_data.driver_id.preferred_language,
                                    key
                                );
                            throw new HttpException(
                                {
                                    error_code:
                                        wrong_otp[
                                        booking_data.driver_id
                                            .preferred_language
                                        ],
                                    error_description:
                                        wrong_otp[
                                        booking_data.driver_id
                                            .preferred_language
                                        ],
                                },
                                HttpStatus.BAD_REQUEST
                            );
                        }
                    } else {
                        start_ride_at = Date.now();
                    }
                } else if (body.status === "reached_at_stop_1") {
                    arrived_at_stop_1 = Date.now();
                } else if (body.status === "reached_at_stop_2") {
                    arrived_at_stop_2 = Date.now();
                } else if (body.status === "reached_at_pickup") {
                    arrived_pickup_loc_at = Date.now();
                } else if (body.status === "started_from_Stop_1") {
                    started_from_stop_1 = Date.now();
                } else if (body.status === "started_from_Stop_2") {
                    started_from_stop_2 = Date.now();
                }
                data = {
                    ride_status: body.status,
                    arrived_at_stop_1: arrived_at_stop_1,
                    arrived_at_stop_2: arrived_at_stop_2,
                    started_from_stop_1: started_from_stop_1,
                    started_from_stop_2: started_from_stop_2,
                    start_ride_at: start_ride_at,
                    arrived_pickup_loc_at: arrived_pickup_loc_at,
                };
            } else {
                data = {
                    ride_status: body.status,
                };
            }

            // Create booking Activity

            this.activityService.logActivity({
                booking_id: body.booking_id.toString(),
                userId: (booking_data.company_id) ? booking_data.company_id : booking_data?.customer_id,
                action: "BOOKING_STATUS",
                resource: "booking",
                description: "Ride Status " + body.status,
                payload: data
            });

            // end 

            await this.update_booking_with_id(body.booking_id, data);

            if (booking_data.customer_id) {
                const fcm_token = await this.fetch_fcm_token(
                    booking_data.customer_id
                );
                let key_1;
                let key_2;

                if (booking_data.request_type === RequestType.Parcel) {
                    key_1 = body.status + "_title";
                    key_2 = body.status + "_description_for_parcel";
                } else {
                    key_1 = body.status + "_title";
                    key_2 = body.status + "_description";
                }

                const reached_title = await this.commonService.localization(
                    booking_data.customer_id.preferred_language,
                    key_1
                );
                const reached_description =
                    await this.commonService.localization(
                        booking_data.customer_id.preferred_language,
                        key_2
                    );
                const booking = await this.model.booking.findOne({
                    _id: body.booking_id,
                });
                for (const fcmTokens of fcm_token) {
                    let pushData = {
                        title: reached_title[
                            booking_data.customer_id.preferred_language
                        ],
                        message:
                            reached_description[
                            booking_data.customer_id.preferred_language
                            ],
                    };
                    let data_push = {
                        type: "booking_update",
                        booking: booking,
                    };

                    try {
                        await this.notification.send_notification(
                            pushData,
                            fcmTokens.fcm_token,
                            data_push
                        );
                    } catch (error) {
                        console.log(error, "notificaiton fail---->");

                    }

                }
            }
            return { messgae: "status updated successfully" };
        } catch (error) {
            console.error("Error in RideStatus:", error);
            throw error;
        }
    }

    async assignADriver(id: string, payload: AssignDriverDto, dispatcher_id) {
        try {
            // const booking_data = await this.find_booking_with_id(id);


            const booking_data = await this.model.booking.findOne({
                _id: new Types.ObjectId(id),
            })
                .select("-sender_country_code -receiver_name -receiver_country_code -receiver_number -parcel_details -pickup_lat -pickup_long -drop_lat -drop_long -stops -is_stop1_charge_noti_send -is_stop2_charge_noti_send -rate_by_customer -rate_by_driver") // Exclude the unwanted fields
                .populate([
                    { path: "customer_id", select: "name email country_code phone image" },
                    { path: "company_id", select: "name email country_code phone" },
                    { path: "driver_id", select: "name email country_code phone image" },
                    { path: "vehicle_id" },
                    { path: "vehicleDetail_id" }
                ]);


            const driver = await this.model.drivers.findById(payload.driver_id)
            const alreadyBooked = await this.model.booking
                .find({
                    _id: { $ne: new Types.ObjectId(id) },
                    driver_id: driver?._id,
                    booking_type: BookingType.Schedule,
                    booking_status: { $in: [BookingStatus.Ongoing, BookingStatus.Accept] },
                    schedule_date: {
                        $gte: moment(booking_data.schedule_date)
                            .subtract(30, "minutes")
                            .valueOf(), // 30 minutes before current time
                        $lt: moment(booking_data.schedule_date)
                            .add(30, "minutes")
                            .valueOf(), // 30 minutes after current time
                    },
                })
            if (alreadyBooked.length) {
                throw new HttpException({
                    error_description: 'This driver is not available on this ride time ',
                    error_code: 'Busy'
                }, HttpStatus.BAD_REQUEST)
            }


            this.sent_broadcast_request_single_driver(booking_data, driver?._id, driver, dispatcher_id)
            let config: any = await this.model.appConfiguration.findOne();
            const app_earning = (booking_data.total_amount * driver?.commission / 100) + booking_data?.gst
            console.log('booking_data?.base_fee', booking_data?.base_fee, driver?.commission, "(booking_data?.base_fee * driver?.commission / 100)", (booking_data?.base_fee * driver?.commission / 100))
            // let calculate_base_fee_for_driver = booking_data?.base_fee - (booking_data?.base_fee * driver?.commission / 100);
            let calculate_base_fee_for_driver = booking_data?.amount_for_driver || 0;
            console.log('calculate_base_fee_for_driver', calculate_base_fee_for_driver)
            let airport_toll = (booking_data.include_airport_toll) ? config?.airport_toll : 0;
            console.log('booking_data.include_airport_toll', booking_data.include_airport_toll, config?.airport_toll, 'airport_toll')
            const amount_for_driver = calculate_base_fee_for_driver + airport_toll
            // booking_data.driver_id = payload.driver_id;
            // booking_data.assigned_by = dispatcher_id;
            //booking_data.booking_status = BookingStatus.Accept;
            // booking_data.app_earning = app_earning
            // booking_data.amount_for_driver = amount_for_driver

            if (booking_data.driver_id !== null) {
                await this.model.drivers.updateOne({
                    current_booking: new Types.ObjectId(id)
                }, {
                    $set: {
                        current_booking: null,
                    }
                })

                // Notify driver about cancellation
                const lang = driver?.preferred_language ?? "english";

                const [titleMsg, descMsg] = await Promise.all([
                    this.commonService.localization(lang, "cancel_request_title"),
                    this.commonService.localization(lang, "cancel_request_description")
                ]);

                const sessions = await this.model.sessions.find({
                    user_id: booking_data?.driver_id
                });

                const notifyPayload = {
                    title: titleMsg[lang],
                    message: descMsg[lang]
                };

                const dataPayload = {
                    type: "cancel_by_dispatcher",
                    booking: booking_data
                };

                for (const session of sessions) {
                    try {
                        await this.notification.send_notification(
                            notifyPayload,
                            session.fcm_token,
                            dataPayload
                        );
                    } catch (err) {
                        console.error("Notification failed:", err);
                    }
                }

            }

            booking_data.driver_id = null; // unassigned from booking if driver is assigned
            booking_data.booking_status = BookingStatus.Request;

            booking_data.save();

            // const find_driver_fcm_token = await this.model.sessions.findOne(
            //     { user_id: booking_data.driver_id, scope: "driver" },
            //     { fcm_token: 1 }
            // );
            // await this.model.drivers.updateMany({
            //     currently_send_ride_request_id: new Types.ObjectId(id)
            // }, {
            //     $set: {
            //         // currently_send_ride_request_id: null,
            //         currently_send_ride_request: false,
            //         currently_send_ride_request_generate_at: null
            //     }
            // })
            // if (find_driver_fcm_token) {
            //     const bookingScheduleString = moment(booking_data.schedule_date)
            //         .add(5, "hours")
            //         .add(30, "minutes")
            //         .format("DD MMM YYYY HH:mm");

            //     let pushData = {
            //         title: `Assignment for Booking`,
            //         message: ` A booking has been assigned to you for ${bookingScheduleString}.`,
            //     };
            //     let data_push = {
            //         // booking: booking,
            //         type: "assign_booking",
            //         // generated_at: Date.now(),
            //     };

            //     try {
            //         await this.notification.send_notification(
            //             pushData,
            //             find_driver_fcm_token.fcm_token,
            //             data_push
            //         );
            //     } catch (error) {
            //         console.log(error, "notificaiton fail---->");

            //     }

            // }
            return { message: "driver assigned", booking_data };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async Ride_Completed(id: string, tollAmount = 0, driver_id: string) {
        try {
            const booking_data: any = await this.find_booking_with_id(id);
            const driver = await this.model.drivers.findOne({ _id: driver_id });

            const toll_amount = Number(tollAmount) || 0;
            const updated_total = (Number(booking_data.total_amount) + toll_amount).toFixed(2);

            const updateData = {
                ride_status: "ride_completed",
                booking_status: BookingStatus.Completed,
                total_amount: Number(updated_total),
                complete_delivery_at: Date.now(),
            };

            await this.activityService.logActivity({
                booking_id: id.toString(),
                userId: driver_id,
                action: "BOOKING_DONE",
                resource: "booking",
                description: "The ride has been completed successfully",
                payload: updateData,
            });

            await this.update_booking_with_id(id, updateData);

            await this.model.drivers.updateMany({ _id: new Types.ObjectId(driver_id) }, {
                currently_send_ride_request: false,
                currently_send_ride_request_id: null,
                currently_send_ride_request_generate_at: null,
                ride_status: ride_status.free,
                curent_booking: null,
            })

            const booking = await this.model.booking.findOne({ _id: id });
            this.sendInvoice(id);
            await this.model.payments.findOneAndUpdate({ booking_id: id }, { driver_id: booking?.driver_id });

            await this.notifyCustomerOnCompletion(booking_data, booking);
            await this.notifyDriverOnCompletion(booking_data, booking);

            return { message: "The ride has been completed successfully." };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    private async notifyCustomerOnCompletion(booking_data: any, booking: any) {
        if (!booking_data.customer_id) return;

        let titleKey: string;
        let descKey: string;

        if (booking_data.request_type === RequestType.Parcel) {
            titleKey = "ride_completed_title_for_parcel";
            descKey = "ride_completed_description_for_parcel";
        } else if (booking_data.stop_charges > 0) {
            titleKey = "ride_completed_title";
            descKey = "ride_completed_description_with_stops";
        } else {
            titleKey = "ride_completed_title";
            descKey = "ride_completed_description";
        }

        const language = booking_data?.customer_id?.preferred_language ?? 'english';
        const titleLocalization = await this.commonService.localization(language, titleKey);
        const descLocalization = await this.commonService.localization(language, descKey);

        const fcmTokens = await this.fetch_fcm_token(booking_data.customer_id);
        const pushData = {
            title: titleLocalization[language],
            message: descLocalization[language],
        };
        const dataPayload = {
            type: "complete_ride",
            booking,
        };

        for (const { fcm_token } of fcmTokens) {
            try {
                await this.notification.send_notification(pushData, fcm_token, dataPayload);
            } catch (error) {
                console.log(error, "notification failure (customer) ---->");
            }
        }
    }

    private async notifyDriverOnCompletion(booking_data: any, booking: any) {
        const language = booking_data?.driver_id?.preferred_language ?? 'english';
        const titleLocalization = await this.commonService.localization(language, "complete_ride_title_driver");
        const descLocalization = await this.commonService.localization(language, "complete_ride_description_driver");

        const fcmTokens = await this.fetch_fcm_token(booking_data.driver_id);
        const pushData = {
            title: titleLocalization[language],
            message: descLocalization[language],
        };
        const dataPayload = {
            type: "complete_ride_driver",
            booking,
        };

        for (const { fcm_token } of fcmTokens) {
            try {
                await this.notification.send_notification(pushData, fcm_token, dataPayload);
            } catch (error) {
                console.log(error, "notification failure (driver) ---->");
            }
        }
    }

    async Ride_Completed_(id, tollAmount = 0, driver_id) {
        try {
            let toll_amount = tollAmount;
            const booking_data: any = await this.find_booking_with_id(id);
            const driver = await this.model.drivers.findOne({ _id: driver_id });
            // if (tollAmount > 0) {
            //     if (driver?.preferred_currency === "INR") {
            //         toll_amount = await this.convert_payment_amount(
            //             driver?.preferred_currency,
            //             tollAmount
            //         );
            //     } else {
            //         toll_amount = tollAmount;
            //     }
            // }
            console.log('booking_data.total_amount', booking_data.total_amount)

            const add_toll_amount =
                Number(booking_data.total_amount) + Number(toll_amount);
            const update_total_amount = add_toll_amount.toFixed(2);

            console.log('add_toll_amount', add_toll_amount)
            console.log('update_total_amount', update_total_amount)

            let data = {
                ride_status: "ride_completed",
                booking_status: BookingStatus.Completed,
                // toll_price: toll_amount,
                total_amount: Number(update_total_amount),
                complete_delivery_at: Date.now(),
            };

            // Create booking Activity

            this.activityService.logActivity({
                booking_id: id.toString(),
                userId: driver_id,
                action: "BOOKING_DONE",
                resource: "booking",
                description: "The ride has been completed successfully",
                payload: data
            });

            // End 

            await this.update_booking_with_id(id, data);
            // await this.model.drivers.updateMany({ _id: new Types.ObjectId(driver_id) }, {
            //     currently_send_ride_request: false,
            //     currently_send_ride_request_id: null,
            //     currently_send_ride_request_generate_at: null,
            //     ride_status: ride_status.free
            // })
            const booking = await this.model.booking.findOne({ _id: id });
            this.sendInvoice(id)
            await this.model.payments.findOneAndUpdate({ booking_id: id }, { driver_id: booking?.driver_id });
            if (booking_data.customer_id) {
                let key_1;
                let key_2;
                if (booking_data.request_type === RequestType.Parcel) {
                    key_1 = "ride_completed_title_for_parcel";
                    key_2 = "ride_completed_description_for_parcel";
                } else if (booking_data.stop_charges > 0) {
                    key_1 = "ride_completed_title";
                    key_2 = "ride_completed_description_with_stops";
                }
                else {
                    key_1 = "ride_completed_title";
                    key_2 = "ride_completed_description";
                }

                const complete_ride_title =
                    await this.commonService.localization(
                        booking_data?.customer_id?.preferred_language ?? 'english',
                        key_1
                    );
                const complete_ride_description =
                    await this.commonService.localization(
                        booking_data?.customer_id?.preferred_language ?? 'english',
                        key_2
                    );
                const fcm_token = await this.fetch_fcm_token(
                    booking_data.customer_id
                );
                for (const fcmTokens of fcm_token) {
                    let pushData = {
                        title: complete_ride_title[
                            booking_data?.customer_id?.preferred_language ?? 'english'
                        ],
                        message:
                            complete_ride_description[
                            booking_data?.customer_id?.preferred_language ?? 'english'
                            ],
                    };
                    let data_push = {
                        type: "complete_ride",
                        booking: booking,
                    };

                    try {
                        await this.notification.send_notification(
                            pushData,
                            fcmTokens.fcm_token,
                            data_push
                        );
                    } catch (error) {
                        console.log(error, "notificaiton fail---->");

                    }

                }
            }
            let key_1_driver = "complete_ride_title_driver";
            let key_2_driver = "complete_ride_description_driver";

            const complete_ride_title_driver =
                await this.commonService.localization(
                    booking_data?.driver_id?.preferred_language ?? 'english',
                    key_1_driver
                );
            const complete_ride_description_driver =
                await this.commonService.localization(
                    booking_data?.driver_id?.preferred_language ?? 'english',
                    key_2_driver
                );
            const fcm_token_driver = await this.fetch_fcm_token(
                booking_data.driver_id
            );
            for (const fcmTokens_driver of fcm_token_driver) {
                let pushData = {
                    title: complete_ride_title_driver[
                        booking_data?.driver_id?.preferred_language ?? 'english'
                    ],
                    message:
                        complete_ride_description_driver[
                        booking_data?.driver_id?.preferred_language ?? 'english'
                        ],
                };
                let data_push = {
                    type: "complete_ride_driver",
                    booking: booking,
                };

                try {
                    await this.notification.send_notification(
                        pushData,
                        fcmTokens_driver.fcm_token,
                        data_push
                    );
                } catch (error) {
                    console.log(error, "notificaiton fail---->");

                }



            }
            return { message: "The ride has been completed successfully" };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async sendInvoice(id: string) {
        try {
            const booking: any = await this.model.booking.findOne({ _id: new Types.ObjectId(id) }).populate([
                { path: "customer_id" },
                { path: "driver_id" },
                { path: "company_id" }
            ])
            const date = moment(booking?.schedule_date ?? booking.created_at).add(5, 'hour').add(30, 'minute').format('DD MMM YYYY hh:mm A')
            let hbsPath = path.join(__dirname, '../email-template/bookingpdf.hbs')
            let content = fs.readFileSync(hbsPath, 'utf8')
            let compiledTemplate = Handlebars.compile(content);
            let htmlContent = compiledTemplate({
                uniqueId: booking?.booking_id,
                Name: booking?.company_id?.name ?? booking?.customer_id?.name,
                Phone: `${booking?.company_id?.country_code ?? booking?.customer_id?.country_code} ${booking?.company_id?.phone ?? booking?.customer_id?.phone}`,
                DriverName: booking?.driver_id?.name,
                bookingDate: date,
                Base_fee: booking?.base_fee ?? 0,
                Child_seat_charges: booking?.child_seat_charge ?? 0,
                Wheel_chair_charges: booking?.wheel_chair_charge ?? 0,
                child_capsule_charges: booking?.child_capsule_charge ?? 0,
                Waiting_charges: booking?.stop_charges ?? 0,
                Gst: booking?.gst ?? 0,
                gov_levy: booking?.gov_levy ?? 0,
                airport_toll: booking?.airport_toll ?? 0,
                Total: booking?.total_amount ?? 0
            }, {
                allowProtoPropertiesByDefault: true,
                allowProtoMethodsByDefault: true,
            });

            let user = booking?.customer_id ? await this.model.customers.findById({ _id: booking?.customer_id?._id }) : null;
            if (!user) {
                user = await this.model.company.findById({ _id: booking?.company_id?._id })
            }

            const pdf = await this.emailService.createPdf(htmlContent)
            await this.emailService.sendInvoice(user.email, user.name, pdf)
            throw new HttpException({ message: "Invoice sent on your email." }, HttpStatus.OK)
        } catch (error) {
            console.log(error, "<----from invoice");
            throw error
        }
    }

    async add_tip(booking_id, body, req, user_id) {
        try {
            let tip_amount = body.tip_amount;
            let customer = await this.model.customers.findOne({ _id: user_id });
            let language = req.headers["language"] || "english";
            const booking_data: any =
                await this.find_booking_with_id(booking_id);
            // if (customer.preferred_currency === "INR") {
            //     tip_amount = await this.convert_payment_amount(
            //         customer.preferred_currency,
            //         body.tip_amount
            //     );
            // } else {
            //     tip_amount = body.tip_amount;
            // }
            if (tip_amount > booking_data.total_amount) {
                let key_1 = "tip_exceed";
                const tip_exceed = await this.commonService.localization(
                    language,
                    key_1
                );
                throw new HttpException(
                    {
                        error_code: tip_exceed[language],
                        error_description: tip_exceed[language],
                    },
                    HttpStatus.BAD_REQUEST
                );
            }

            const add_tip_amount =
                Number(booking_data.total_amount) + Number(tip_amount);
            const update_total_amount = add_tip_amount.toFixed(2);
            let data = {
                tip_amount: tip_amount,
                total_amount: update_total_amount,
            };
            await this.update_booking_with_id(booking_id, data);
            const fcm_token = await this.fetch_fcm_token(
                booking_data.driver_id
            );

            let key_1 = "update_tip_title";
            let key_2 = "update_tip_description";

            const update_tip_title = await this.commonService.localization(
                booking_data.driver_id.preferred_language,
                key_1
            );
            const update_tip_description =
                await this.commonService.localization(
                    booking_data.driver_id.preferred_language,
                    key_2
                );
            const booking: any = await this.find_booking_with_id(booking_id);
            for (const fcmTokens of fcm_token) {
                let pushData = {
                    title: update_tip_title[
                        booking_data.driver_id.preferred_language
                    ],
                    message:
                        update_tip_description[
                        booking_data.driver_id.preferred_language
                        ],
                };
                let data_push = {
                    type: "update_tip",
                    booking: booking,
                };
                try {
                    await this.notification.send_notification(
                        pushData,
                        fcmTokens.fcm_token,
                        data_push
                    );
                } catch (error) {
                    console.log(error, "notificaiton fail---->");

                }

            }
            return { message: "Tip added successfully" };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async booking_listing(body, payload) {
        try {
            let user;
            let bookings: any = [];
            let count = 0;
            const skip = (+body.page > 0) ? (body.page - 1) * body.limit : 0;
            if (payload.scope === "driver") {
                user = await this.model.drivers.findOne({
                    _id: payload.user_id,
                });
            } else {
                user = await this.model.customers.findOne({
                    _id: payload.user_id,
                });
            }
            if (body.status === "current") {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (payload.scope === "driver") {
                    bookings = await this.model.booking
                        .find({
                            driver_id: new mongosse.Types.ObjectId(
                                payload.user_id
                            ),
                            booking_status: {
                                $in: [BookingStatus.Accept],
                            },
                            $or: [
                                { payment_success: true },
                                { dispatcher_id: { $ne: null } }
                            ]
                        })
                        .sort({ created_at: -1 })
                        .skip(skip)
                        .limit(body.limit);

                    count = await this.model.booking.countDocuments({
                        driver_id: new mongosse.Types.ObjectId(payload.user_id),
                        booking_status: { $in: [BookingStatus.Accept, null] },
                        $or: [
                            { payment_success: true },
                            { dispatcher_id: { $ne: null } }
                        ]
                    });
                } else {
                    bookings = await this.model.booking
                        .find({
                            customer_id: new mongosse.Types.ObjectId(
                                payload.user_id
                            ),
                            booking_status: {
                                $in: [BookingStatus.Accept, null],
                            },
                            $or: [
                                { payment_success: true },
                                { dispatcher_id: { $ne: null } }
                            ]
                        })
                        .sort({ created_at: -1 })
                        .skip(skip)
                        .limit(body.limit);
                    count = await this.model.booking.countDocuments({
                        customer_id: new mongosse.Types.ObjectId(
                            payload.user_id
                        ),
                        booking_status: { $in: [BookingStatus.Accept, null] },
                        payment_success: true

                    });
                }
            } else if (body.status === "past") {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (payload.scope === "driver") {
                    bookings = await this.model.booking
                        .find({
                            driver_id: new mongosse.Types.ObjectId(
                                payload.user_id
                            ),
                            $or: [
                                { payment_success: true },
                                { dispatcher_id: { $ne: null } }
                            ],
                            booking_status: {
                                $in: [
                                    BookingStatus.Cancelled,
                                    BookingStatus.Completed,
                                    BookingStatus.Failed,
                                ],
                            },
                        })
                        .sort({ created_at: -1 })
                        .skip(skip)
                        .limit(body.limit);

                    count = await this.model.booking.countDocuments({
                        driver_id: new mongosse.Types.ObjectId(payload.user_id),
                        $or: [
                            { payment_success: true },
                            { dispatcher_id: { $ne: null } }
                        ],
                        booking_status: {
                            $in: [
                                BookingStatus.Cancelled,
                                BookingStatus.Completed,
                                BookingStatus.Failed,
                            ],
                        },
                    });
                } else {
                    bookings = await this.model.booking
                        .find({
                            customer_id: new mongosse.Types.ObjectId(
                                payload.user_id
                            ),
                            booking_status: {
                                $in: [
                                    BookingStatus.Cancelled,
                                    BookingStatus.Completed,
                                    BookingStatus.Failed,
                                ],
                            },
                            payment_success: true,
                        })
                        .sort({ created_at: -1 })
                        .skip(skip)
                        .limit(body.limit);

                    count = await this.model.booking.countDocuments({
                        customer_id: new mongosse.Types.ObjectId(
                            payload.user_id
                        ),
                        booking_status: {
                            $in: [
                                BookingStatus.Cancelled,
                                BookingStatus.Completed,
                                BookingStatus.Failed,
                            ],
                        },
                        payment_success: true,
                    });
                }
            }

            return { count: count, data: bookings };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async booking_cancelled(
        booking_id: string,
        body: CancelBookingDto,
        payload,
        req
    ) {
        try {
            let language = req.headers["language"] || "english";
            let key_1 = "cancelled_booking";
            const cancel_booking_msg = await this.commonService.localization(
                language,
                key_1
            );
            let booking_detail: any = await this.model.booking.findOne({ _id: booking_id })

            if (booking_detail.booking_status === BookingStatus.Completed) {
                throw new HttpException({
                    error: "Booking already completed cannot cancelled!",
                    description: "Booking already completed cannot cancelled!"
                }, HttpStatus.BAD_REQUEST)
            }
            let query = {}
            console.log(payload.scope, '<----payload_scope');

            if (payload.scope === 'driver') {
                await this.model.drivers.findOneAndUpdate(
                    { _id: booking_detail.driver_id },
                    {
                        currently_send_ride_request: false,
                        current_booking: null,
                        currently_send_ride_request_id: null,
                        currently_send_ride_request_generate_at: null,
                        ride_status: ride_status.free,

                    }
                );

                // create booking Activity
                var recordData;
                if (payload.scope == 'customer') {
                    recordData = await this.model.customers.findById({ _id: new mongosse.Types.ObjectId(payload?.user_id) });
                } else {
                    recordData = await this.model.drivers.findById({ _id: new mongosse.Types.ObjectId(payload?.user_id) });
                }

                this.activityService.logActivity({
                    booking_id: booking_id,
                    userId: payload.user_id,
                    action: "CANCELLED",
                    resource: "booking",
                    description: "Booking cancelled by " + payload.scope + " - " + recordData?.name,
                    payload: payload
                });

                // end 


                if (booking_detail.schedule_date) {
                    query = {
                        cancelled_by: payload.scope,
                        cancelled_reason: body.cancelled_reason,
                        booking_status: null,
                        ride_status: null,
                        arrived_pickup_loc_at: null,
                        updated_at: moment().valueOf(),
                        booking_type: BookingType.Schedule,
                        // $push: { cancelled_driver_ids: payload.user_id },
                        driver_id: null,
                        // amount_for_driver: 0,
                        app_earning: 0,
                        is_ride_started: false,
                        sent_dispatch_noti: false,
                    }
                    console.log(query, '<--------query booking_detail.schedule_date');
                } else {
                    console.log("payload.driver_id===>", payload.user_id);
                    query = {
                        cancelled_by: payload.scope,
                        cancelled_reason: body.cancelled_reason,
                        booking_status: null,
                        ride_status: null,
                        arrived_pickup_loc_at: null,
                        updated_at: moment().valueOf(),
                        $push: { cancelled_driver_ids: payload.user_id },
                        amount_for_driver: 0,
                        app_earning: 0,
                        is_ride_started: false,
                        sent_dispatch_noti: false,
                    }
                    console.log(query, '<--------query');
                }
                booking_detail = await this.model.booking.findOneAndUpdate(
                    { _id: booking_id },
                    query,
                    { new: true }
                ).populate([
                    { path: "customer_id", select: " name email country_code phone image " },
                    { path: "driver_id", select: " name email country_code phone image " },
                    { path: "vehicle_id" },
                    { path: "vehicleDetail_id" },
                    { path: "company_id", select: "name email country_code phone_no created_at" }
                ]);
                let session = await this.model.sessions.findOne({ user_id: booking_detail.customer_id }, { fcm_token: 1 })
                const notifyPayload = {
                    title: "Ride Cancellation Notification",
                    // message: "The driver has cancelled the ride. We are currently looking for another driver to assist you."
                    message: `The driver has cancelled the ride. Reason: ${body.cancelled_reason}.. We are currently looking for another driver to assist you.`
                };
                let data_push = {
                    type: "driver_cancelled",
                    booking: booking_detail,
                };
                try {
                    await this.notification.send_notification(
                        notifyPayload,
                        session?.fcm_token || null,
                        data_push
                    );
                } catch (error) {
                    console.log(error, '<----notification failed from booking cancelled bby driver');
                }

                if (!booking_detail.schedule_date) {
                    let add30min = moment(booking_detail.accept_ride_at)
                        .add(30, "minute")
                        .valueOf();
                    if (add30min >= moment().valueOf()) {
                        this.send_push_to_nearest_drivers(
                            booking_detail,
                            booking_detail.customer_id
                        );
                    }
                } else if (booking_detail.schedule_date) {
                    console.log("INNNNNNNN --CANCEL")
                    const currentTime = moment().valueOf();
                    const scheduleTime = moment(booking_detail.schedule_date).valueOf();
                    const timeDifference = moment(scheduleTime).diff(currentTime, 'minute'); // future = positive, past = negative

                    // Only proceed if the schedule time is not more than 5 minutes in the past
                    if (timeDifference >= -5 && timeDifference <= 25) {     //changed to 25 minute
                        console.log("INNNNNNNN --CANCEL - ", timeDifference)



                        this.sent_broadcast_request(booking_detail, "again auto");
                    }
                    // else: do nothing silently
                }
                // else if (booking_detail.schedule_date) {
                //     const currentTime = moment().valueOf()
                //     const timeDifference = moment(booking_detail.schedule_date).diff(currentTime, 'minute')
                //     if (timeDifference <= 30) {
                //         this.sent_broadcast_request(booking_detail)
                //     }
                // }
                const driver = await this.model.drivers.findOne({ _id: booking_detail?.driver_id?._id })
                const customer = await this.model.customers.findOne({ _id: booking_detail?.customer_id?._id })
                this.emailService.notifyAdminAboutCancellation(body.cancelled_reason, booking_detail, driver, customer)
                const payloadOFDispatcher = {
                    title: "Ride Cancellation Notification",
                    message: `The driver has cancelled the ride. Reason: ${body.cancelled_reason}. We are currently looking for another driver to assist customer.`
                };
                const isCatch = true
                this.notifyDispatcher(payloadOFDispatcher, isCatch, driver, booking_detail)
            }
            else {
                query = {
                    cancelled_by: payload.scope,
                    cancelled_reason: body.cancelled_reason,
                    booking_status: BookingStatus.Cancelled,
                    booking_type: "cancelled",
                }

                const booking = await this.model.booking.findOneAndUpdate(
                    { _id: booking_id },
                    query,
                    { new: true }
                );

                await this.model.drivers.updateOne(
                    { currently_send_ride_request_id: new Types.ObjectId(booking_id) },
                    {
                        currently_send_ride_request: false,
                        current_booking: null,
                        currently_send_ride_request_id: null,
                        currently_send_ride_request_generate_at: null,
                        ride_status: ride_status.free
                    }
                );

                if (booking.payment_method != 'invoice') {
                    this.cancelRefund(booking, payload);
                }
                // create booking Activity

                var recordData;

                if (payload.scope == 'customer') {

                    recordData = await this.model.customers.findById({ _id: new mongosse.Types.ObjectId(payload?.user_id) });

                } else {
                    recordData = await this.model.drivers.findById({ _id: new mongosse.Types.ObjectId(payload?.user_id) });

                }

                this.activityService.logActivity({
                    booking_id: booking_id,
                    userId: payload.user_id,
                    action: "CANCELLED",
                    resource: "booking",
                    description: "Booking cancelled by " + recordData?.name,
                    payload: payload
                });

                // end 
                if (payload.scope == 'customer' && !booking.company_id) {
                    await this.model.customers.updateOne(
                        { _id: booking.customer_id },
                        { current_booking: null }
                    );
                    const sendTo =
                        req?.payload?.user_id == booking.customer_id
                            ? booking?.driver_id
                            : booking?.customer_id;
                    try {
                        const user = await this.model.drivers.findOne({
                            _id: booking.driver_id,
                        });
                        const key_2 = "ride_cancelled_description_customer";
                        const key_1 = "ride_cancelled_title_customer";

                        const ride_cancel_title =
                            await this.commonService.localization(
                                user?.preferred_language || "english",
                                key_1
                            );
                        const ride_cancel_description =
                            await this.commonService.localization(
                                user?.preferred_language || "english",
                                key_2
                            );

                        const fcm_token = await this.model.sessions.find({
                            user_id: sendTo,
                        });
                        for (const fcmTokens of fcm_token) {
                            const notifyPayload = {
                                title: ride_cancel_title[
                                    user?.preferred_language || "english"
                                ],
                                message:
                                    ride_cancel_description[
                                    user?.preferred_language || "english"
                                    ],
                            };
                            let data_push = {
                                type: "ride_cancelled",
                                booking: booking,
                            };

                            try {
                                await this.notification.send_notification(
                                    notifyPayload,
                                    fcmTokens.fcm_token,
                                    data_push
                                );
                            } catch (error) {
                                console.log(error, "notificaiton fail---->");

                            }


                        }
                    } catch (error) {
                        console.log(error, "<-----notification failed");
                    }
                    const payload = {
                        title: `Booking Cancelled!!`,
                        message: `Customer has cancelled their booking #${booking?.booking_id}.`
                    }
                    this.notifyDispatcher(payload, false, null, booking)
                }
            }

            return { message: cancel_booking_msg[language] };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    // async notifyAdminAboutCancellation(body: CancelBookingDto, booking) {
    //     try {
    //         const driver = await this.model.drivers.findOne({ _id: booking?.driver_id?._id })
    //         const customer = await this.model.customers.findOne({ _id: booking?.customer_id?._id })
    //         try {
    //             let file_path = path.join(
    //                 __dirname,
    //                 "../../dist/email-template/notifyAdmin.hbs"
    //             );

    //             let html = fs.readFileSync(file_path, { encoding: "utf-8" });
    //             const template = Handlebars.compile(html);
    //             const data = {
    //                 ORDER_ID: booking?.booking_id,
    //                 CUS_NAME: customer?.name,
    //                 CUS_PHONE: `${customer?.country_code} ${customer?.phone}`,
    //                 PICKUP: booking?.pickup_address,
    //                 DROP: booking?.drop_address,
    //                 DRIVER_NAME: driver?.name,
    //                 DRIVER_PHONE: `${driver?.country_code} ${driver?.phone}`,
    //                 REASON: body?.cancelled_reason
    //             };
    //             const htmlToSend = template(data);

    //             let mailData = {
    //                 to: 'support@tiptopmaxisydney.com.au',
    //                 subject: `Notification about ride cancellation`,
    //                 html: htmlToSend,
    //             };

    //             const sentmail = await this.commonService.sendmail(
    //                 mailData.to,
    //                 mailData.subject,
    //                 null,
    //                 mailData.html
    //             );
    //             console.log(sentmail, '<----sentmail');
    //             return sentmail
    //         } catch (error) {
    //             throw error;
    //         }
    //     } catch (error) {
    //         console.log(error, '<---admin notified about cancellation');
    //         throw error
    //     }
    // }

    async check_rides_under_5km_radius(pickup_lat, pick_up_long, filter) {
        try {
            let available_drivers: any[] = [];
            const availableVehicleIds: any[] = [];
            let drivers = await this.model.drivers.find({
                status: DriverStatus.Online,
                is_approved: true,
                is_active: true,
                ride_status: ride_status.free,
            });

            //fetch that driver they are under 5 km radius
            for (const driver of drivers) {
                let distance_in_radius =
                    await this.commonService.calculate_radius_distance(
                        pickup_lat,
                        pick_up_long,
                        driver.latitude,
                        driver.longitude
                    );

                if (distance_in_radius <= 7) {
                    available_drivers.push({
                        driver_id: driver,
                    });
                }
            }

            for (const driver_detail of available_drivers) {
                const query: any = {
                    driver_id: driver_detail.driver_id._id,
                    status: "active",
                };

                if (filter?.includes("wheel_chair")) {
                    query.wheel_chair_availabilty = true;
                }
                if (filter?.includes("child_seat")) {
                    query.child_seat_availabilty = true;
                }
                // if (filter?.includes("child_capsule")) {
                //     query.child_capsule_availabilty = true;
                // }

                const available_vehicle: any =
                    await this.model.vehicle_detail.find(query, {}, { $sort: { passenger: 1 } });

                const duration_time = await this.commonService.getDuration(
                    pickup_lat,
                    pick_up_long,
                    driver_detail.driver_id.latitude,
                    driver_detail.driver_id.longitude
                );

                for (const vehicle of available_vehicle) {
                    availableVehicleIds.push({
                        vehicle_id: vehicle.vehicle_id,
                        duration_time: duration_time,
                    });
                }
            }
            return availableVehicleIds;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async delayLoop(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    async find_drivers_under_5km_radius(
        pickup_lat,
        pick_up_long,
        vehicle_id: string,
        booking_id,
        no_of_childcapsule,
        no_of_childseat,
        no_of_wheelchair,
        created_at,
        customer
    ) {
        const TIME_LIMIT = 180; // 3 minutes in milliseconds
        console.log("INNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN")
        while (true) {
            console.log('<----we are here to find driver step 2 ----->');
            console.log(booking_id, '<---booking_id');

            const booking_detail = await this.model.booking.findOne({
                _id: booking_id,
                booking_status: { $nin: [BookingStatus.Failed, BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.Ongoing, BookingStatus.Accept] }
            });

            if (!booking_detail) {

                // create booking Activity

                this.activityService.logActivity({
                    booking_id: booking_id.toString(),
                    userId: customer,
                    action: "DRIVER_SEARCH_CASE",
                    resource: "booking",
                    description: "Booking Not Found",
                    payload: { booking_id: booking_id }
                });

                // end 

                console.log('booking may be cancelled failed or completed----------->');
                break;
            }

            let current_time_in_ms = moment().valueOf();
            let next_3_min = moment(created_at).add(3, 'minute').valueOf();

            let driversWithDistances = [];
            let same_vehicle_driver: any[] = [];

            const payload_vehicle_type: any = await this.model.vehicleType.findOne(
                { _id: vehicle_id },
                { _id: 1, vehicle_type: 1 }
            );
            console.log(payload_vehicle_type, '<----payload_vehicle_type');

            let vehicleTypesToInclude: string[] = [];

            if (payload_vehicle_type?.vehicle_type === "Sedan") {
                vehicleTypesToInclude = ["Sedan", "SUV"];
            } else if (payload_vehicle_type?.vehicle_type === "SUV") {
                vehicleTypesToInclude = ["SUV", "Minibus"];
            } else if (payload_vehicle_type?.vehicle_type === "Minibus") {
                vehicleTypesToInclude = ["Minibus"];
            }

            const matchedVehicles = await this.model.vehicleType.find(
                { vehicle_type: { $in: vehicleTypesToInclude } },
                { _id: 1, vehicle_type: 1 }
            );

            const matchedVehicleIds = matchedVehicles.map((v: any) => v._id);
            const vehicleIdToName = new Map<string, string>();
            const typePriority: any = { Sedan: 1, SUV: 2, Minibus: 3 };

            matchedVehicles.forEach((v: any) => {
                vehicleIdToName.set(v._id.toString(), v.vehicle_type);
            });

            let queryFilter: any = {
                vehicle_id: { $in: matchedVehicleIds },
                status: "active"
            };

            if (no_of_wheelchair) {
                queryFilter["wheel_chair_availabilty"] = true;
                queryFilter.no_of_wheelchair = { $gte: no_of_wheelchair }
            }
            if (no_of_childseat) {
                queryFilter["child_seat_availabilty"] = true;
                queryFilter.no_of_childseat = { $gte: no_of_childseat }
            }
            if (no_of_childcapsule) {
                queryFilter["child_capsule_availabilty"] = true;
                queryFilter.no_of_childcapsule = { $gte: no_of_childcapsule }
            }
            if (booking_detail?.passenger) {
                queryFilter.no_of_seat = { $gte: booking_detail.passenger }
            }

            let driversIds = await this.model.vehicle_detail.find(
                queryFilter,
                {
                    driver_id: 1,
                    vehicle_id: 1
                }
            );

            // Sort by vehicle type priority (Sedan -> SUV -> Minibus)
            driversIds.sort((a: any, b: any) => {
                const typeA = vehicleIdToName.get(a.vehicle_id.toString()) || "";
                const typeB = vehicleIdToName.get(b.vehicle_id.toString()) || "";
                return typePriority[typeA] - typePriority[typeB];
            });

            console.log(driversIds, '<-----------sorted driversIds');

            let dispatch_drivers_upcoming_in_45min: any = await this.dispatchBookingDrivers();
            const excludedDriverIds = dispatch_drivers_upcoming_in_45min.map((driver) => driver.driver_id);
            console.log(excludedDriverIds, '<---excludedDriverIds');

            for (const check_driver_radius of driversIds) {
                let driver_location = await this.model.drivers.findOne({
                    _id: check_driver_radius.driver_id,
                });

                let distance_in_radius = await this.commonService.calculate_radius_distance(
                    pickup_lat,
                    pick_up_long,
                    driver_location?.latitude || 0,
                    driver_location?.longitude || 0
                );

                if (distance_in_radius <= 7) {
                    driversWithDistances.push({
                        driver_id: check_driver_radius.driver_id,
                        distance: distance_in_radius
                    });
                }
            }

            driversWithDistances.sort((a, b) => a.distance - b.distance);

            same_vehicle_driver = driversWithDistances.map((driver) => driver.driver_id);

            const already_noti_send: any = await this.model.booking_notifications.findOne({
                booking_id: new mongoose.Types.ObjectId(booking_id),
            });

            const customer_detail = await this.model.customers.findOne({
                _id: new Types.ObjectId(customer),
            });

            for (const driverId of same_vehicle_driver) {
                const query = {
                    $and: [
                        { _id: driverId },
                        {
                            phone: { $ne: customer_detail.phone },
                            email: { $ne: customer_detail.email },
                            status: DriverStatus.Online,
                            ride_status: ride_status.free,
                            is_deleted: false,
                            is_approved: true,
                            currently_send_ride_request: false
                        }
                    ],
                };

                if (booking_detail?.cancelled_driver_ids?.length) {
                    query.$and.push({ _id: { $nin: booking_detail.cancelled_driver_ids } });
                }
                if (excludedDriverIds?.length) {
                    query.$and.push({ _id: { $nin: excludedDriverIds } });
                }
                if (already_noti_send?.driver_ids?.length) {
                    const drivers = already_noti_send.driver_ids.map((res: string) => new Types.ObjectId(res));
                    query.$and.push({ _id: { $nin: drivers } });
                }

                const driverLocation = await this.model.drivers.findOne(
                    query,
                    {
                        latitude: 1,
                        longitude: 1,
                        _id: 1,
                        preferred_language: 1,
                        preferred_currency: 1,
                        commission: 1
                    }
                );

                if (driverLocation) {
                    return driverLocation;
                }

                if (moment().valueOf() > next_3_min) {

                    // create booking Activity

                    this.activityService.logActivity({
                        booking_id: booking_id.toString(),
                        userId: customer,
                        action: "BOOKING_FAIL",
                        resource: "booking",
                        description: "Booking Failed - No Available Drivers Nearby",
                        payload: { booking_id: booking_id, booking_status: BookingStatus.Failed }
                    });

                    // end 

                    const bookingData = await this.model.booking.findOneAndUpdate(
                        { _id: booking_id },
                        { booking_status: BookingStatus.Failed },
                        { new: true }
                    );

                    await this.model.drivers.updateMany(
                        { currently_send_ride_request_id: booking_id },
                        { currently_send_ride_request: false }
                    );

                    const scope = { scope: "failed" };
                    if (bookingData.payment_method !== 'invoice') {
                        this.cancelRefund(bookingData, scope);
                    }

                    const booking = await this.model.booking.findOne({ _id: booking_id });
                    const fcm_token = await this.model.sessions.find({ user_id: booking.customer_id });

                    await this.model.customers.updateOne(
                        { _id: booking.customer_id },
                        { current_booking: null }
                    );

                    let pushData;
                    for (let fcmToken of fcm_token) {
                        pushData = customer_detail.preferred_language === "english"
                            ? {
                                title: "No Available Drivers Nearby",
                                message: "We’re sorry, but we couldn't find a driver at this moment. Please try again in a few minutes.",
                            }
                            : {
                                title: "आसपास कोई उपलब्ध ड्राइवर नहीं",
                                message: "हमें खेद है, लेकिन इस समय कोई ड्राइवर नहीं मिल सका। कृपया कुछ मिनटों बाद पुनः प्रयास करें।",
                            };

                        const data_push = {
                            booking: booking,
                            type: "driver_not_available",
                        };

                        try {
                            await this.notification.send_notification(
                                pushData,
                                fcmToken.fcm_token,
                                data_push
                            );
                        } catch (error) {
                            console.log(error, "notification fail---->");
                        }
                    }

                    // create booking Activity

                    this.activityService.logActivity({
                        booking_id: booking_id.toString(),
                        userId: customer,
                        action: "DRIVER_SEARCH",
                        resource: "booking",
                        description: "We’re sorry, but we couldn't find a driver at this moment. Please try again in a few minutes.",
                        payload: { booking_id: booking_id, current_booking: null }
                    });

                    // end 

                    throw new HttpException(
                        {
                            error_code: "DRIVER_NOT_AVAILABLE",
                            error_description: "Driver not available",
                        },
                        HttpStatus.BAD_REQUEST
                    );
                }
            }

            await this.delayLoop(1000);
        }
    }


    async find_drivers_under_5km_radius_old(
        pickup_lat,
        pick_up_long,
        vehicle_id: string,
        booking_id,
        no_of_childcapsule,
        no_of_childseat,
        no_of_wheelchair,
        created_at,
        customer
    ) {
        const TIME_LIMIT = 180; // 3 minutes in milliseconds
        while (true) {
            console.log('<----we are here to find driver step 2 ----->');
            console.log(booking_id, '<---booking_id');

            const booking_detail = await this.model.booking.findOne({
                _id: booking_id,
                booking_status: { $nin: [BookingStatus.Failed, BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.Ongoing, BookingStatus.Accept] }
            });
            console.log(booking_detail, '<-----booking_detail');

            if (!booking_detail) {
                console.log('booking may be cancelled failed or completed----------->');
                break;
            }
            let current_time_in_ms = moment().valueOf();
            let next_3_min = moment(created_at).add(3, 'minute').valueOf();
            let driversWithDistances = [];
            let same_vehicle_driver: any[] = [];

            let queryFilter: any = {
                //vehicle_id: vehicle_id,
                status: "active",
            };
            if (no_of_wheelchair) {
                queryFilter["wheel_chair_availabilty"] = true;
                queryFilter.no_of_wheelchair = { $gte: no_of_wheelchair }
            }
            if (no_of_childseat) {
                queryFilter["child_seat_availabilty"] = true;
                queryFilter.no_of_childseat = { $gte: no_of_childseat }
            }
            if (no_of_childcapsule) {
                queryFilter["child_capsule_availabilty"] = true;
                queryFilter.no_of_childcapsule = { $gte: no_of_childcapsule }
            }
            if (booking_detail?.passenger) {
                queryFilter.no_of_seat = { $gte: booking_detail.passenger }
            }

            const driversIds = await this.model.vehicle_detail.find(
                queryFilter,
                {
                    driver_id: 1,
                }
            );
            console.log(driversIds, '<-----------driversIds');

            let dispatch_drivers_upcoming_in_45min: any =
                await this.dispatchBookingDrivers();
            const excludedDriverIds =
                dispatch_drivers_upcoming_in_45min.map(
                    (driver) => driver.driver_id
                );
            console.log(excludedDriverIds, '<---excludedDriverIds');

            for (const check_driver_radius of driversIds) {
                let driver_location = await this.model.drivers.findOne({
                    _id: check_driver_radius.driver_id,
                });

                let distance_in_radius =
                    await this.commonService.calculate_radius_distance(
                        pickup_lat,
                        pick_up_long,
                        driver_location?.latitude
                            ? driver_location.latitude
                            : 0,
                        driver_location?.longitude
                            ? driver_location.longitude
                            : 0
                    );

                if (distance_in_radius <= 7) {
                    driversWithDistances.push({
                        driver_id: check_driver_radius.driver_id,
                        distance: distance_in_radius.toFixed(2),
                    });

                }
            }

            // Sort the drivers by distance in ascending order

            driversWithDistances.sort(
                (a, b) => a.distance - b.distance
            );

            // Extract and push driver IDs into the same_vehicle_driver array
            same_vehicle_driver = driversWithDistances.map(
                (driver) => driver.driver_id
            );
            console.log(booking_id, '<----booking_id')
            const already_noti_send: any =
                await this.model.booking_notifications.findOne({
                    booking_id: new mongoose.Types.ObjectId(booking_id),
                });
            console.log(already_noti_send?.driver_ids, '<----already_noti_send.driver_ids');

            let customer_detail = await this.model.customers.findOne({
                _id: new Types.ObjectId(customer),
            });

            for (const driverId of same_vehicle_driver) {

                const query = {
                    $and: [
                        { _id: driverId, },
                        {
                            phone: { $ne: customer_detail.phone },
                            email: { $ne: customer_detail.email },
                            status: DriverStatus.Online,
                            ride_status: ride_status.free,
                            is_deleted: false,
                            is_approved: true,
                            currently_send_ride_request: false
                        }
                    ],
                };

                if (booking_detail?.cancelled_driver_ids?.length) {
                    console.log(booking_detail?.cancelled_driver_ids, '<=====booking_detail?.cancelled_driver_ids case');
                    query.$and.push({ _id: { $nin: booking_detail.cancelled_driver_ids } });
                }
                if (excludedDriverIds?.length) {
                    console.log(excludedDriverIds, '<=====excludedDriverIds case');
                    query.$and.push({ _id: { $nin: excludedDriverIds } });
                }
                if (already_noti_send?.driver_ids?.length) {
                    console.log(already_noti_send?.driver_ids, '<=====already_noti_send?.driver_ids case');
                    const drivers = already_noti_send.driver_ids.map((res: string) => new Types.ObjectId(res));
                    query.$and.push({ _id: { $nin: drivers } });
                    console.log(query, '<-----query from already_noti_send?.driver_ids?.length');
                }
                console.log(query, '<------query');
                console.log(JSON.stringify(query), '<------query stringify');

                const driverLocation = await this.model.drivers.findOne(
                    query,
                    {
                        latitude: 1,
                        longitude: 1,
                        _id: 1,
                        preferred_language: 1,
                        preferred_currency: 1,
                        commission: 1
                    } // Projection: Include latitude, longitude, and _id fields
                );
                console.log(driverLocation, '<----driverLocation');

                if (driverLocation) {
                    return driverLocation;
                }

                console.log((next_3_min - current_time_in_ms) / 1000, '<--bookings_sec', TIME_LIMIT, 'time limit')
                console.log(current_time_in_ms > next_3_min, '<---condition to terminate')
                if (current_time_in_ms > next_3_min) {
                    const bookingData = await this.model.booking.findOneAndUpdate(
                        { _id: booking_id },
                        { booking_status: BookingStatus.Failed },
                        { new: true }
                    );
                    await this.model.drivers.updateMany({ currently_send_ride_request_id: booking_id },
                        {
                            currently_send_ride_request: false
                        }
                    )
                    const scope = { scope: "failed" }
                    if (bookingData.payment_method != 'invoice') {
                        this.cancelRefund(bookingData, scope);
                    }
                    const booking = await this.model.booking.findOne({
                        _id: booking_id,
                    });
                    console.log(booking.customer_id, '<-----booking.customer_id')
                    const fcm_token = await this.model.sessions.find({
                        user_id: booking.customer_id,
                    });
                    console.log(fcm_token, '<----fcm_token');

                    await this.model.customers.updateOne(
                        { _id: booking.customer_id },
                        { current_booking: null }
                    );
                    let pushData;
                    for (let fcmToken of fcm_token) {
                        if (
                            customer_detail.preferred_language === "english"
                        ) {
                            pushData = {
                                title: "No Available Drivers Nearby",
                                message:
                                    "We’re sorry, but we couldn't find a driver at this moment. Please try again in a few minutes.",
                            };
                        } else {
                            pushData = {
                                title: "आसपास कोई उपलब्ध ड्राइवर नहीं",
                                message:
                                    "हमें खेद है, लेकिन इस समय कोई ड्राइवर नहीं मिल सका। कृपया कुछ मिनटों बाद पुनः प्रयास करें।",
                            };
                        }
                        let data_push = {
                            booking: booking,
                            type: "driver_not_available",
                        };

                        console.log(fcmToken.fcm_token, '<-----fcmToken.fcm_token');

                        try {

                            await this.notification.send_notification(
                                pushData,
                                fcmToken.fcm_token,
                                data_push
                            );
                        } catch (error) {
                            console.log(error, "notificaiton fail---->");

                        }

                    }
                    throw new HttpException(
                        {
                            error_code: "DRIVER_NOT_AVAILABLE",
                            error_description: "Driver not available",
                        },
                        HttpStatus.BAD_REQUEST
                    );
                }
            }
            await this.delayLoop(1000)

        }
    }

    async calculate_booking_amount(
        base_fee,
        coupon_amount,
        gst,
        surcharge_amount,
        child_seat_charges,
        wheel_chair_charge,
        pending_booking_amount
    ) {
        try {
            let gst_amount;
            let coupan_discount_amount;
            // let total_amount;
            let total_amount_with_tax = 0;
            let total_surcharge_amount;
            let base_fee_with_surcharge;
            let total_base_fee;
            if (surcharge_amount > 1) {
                base_fee_with_surcharge = base_fee + child_seat_charges + wheel_chair_charge
                //+ pending_booking_amount * surcharge_amount;
                coupan_discount_amount = base_fee_with_surcharge - coupon_amount;
                gst_amount = base_fee_with_surcharge * (gst / 100);
                total_amount_with_tax = (coupan_discount_amount + (pending_booking_amount * surcharge_amount)) + gst_amount;
                total_surcharge_amount = (base_fee_with_surcharge - base_fee).toFixed(2);
            } else {
                total_base_fee =
                    base_fee +
                    child_seat_charges +
                    wheel_chair_charge
                // pending_booking_amount;
                gst_amount = total_base_fee * (gst / 100);
                coupan_discount_amount = total_base_fee - coupon_amount;
                // total_amount = coupan_discount_amount;
                total_amount_with_tax = (coupan_discount_amount + pending_booking_amount) + gst_amount;
            }

            let data = {
                gst_amount: gst_amount,
                coupan_discount_amount: coupan_discount_amount,
                total_amount: total_amount_with_tax,
                surcharge_amount: total_surcharge_amount,
                child_seat_charge: child_seat_charges,
                wheel_chair_charge: wheel_chair_charge,
                pending_booking_amount: pending_booking_amount,
            };
            return data;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async calculate_coupon_discount(
        coupon_id,
        base_fee,
        user_id,
        surcharge_amount
    ) {
        try {
            let base_fee_with_surcharge;
            if (surcharge_amount > 1) {
                base_fee_with_surcharge = base_fee * surcharge_amount;
            } else {
                base_fee_with_surcharge = base_fee;
            }
            const data: any = await this.model.coupons.findOne({
                _id: coupon_id,
            });
            if (data.type === CouponType.OneTime) {
                await this.model.coupons.updateOne(
                    { _id: data._id },
                    { $push: { used_by: user_id }, date_of_use: Date.now() }
                );
            }
            const percent_amount =
                (data.discount_percentage / 100) * base_fee_with_surcharge;
            if (percent_amount > data.maximum_discount_amount) {
                return data.maximum_discount_amount;
            } else {
                return percent_amount;
            }
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async create_booking(
        body,
        toll_charges,
        calculation_data,
        coupon_amount,
        user_id,
        distance,
        base_fee,
        base_fee_discount,
        vehicle_pricing,
        additional_fee,
        dispatcher_id?
    ) {
        try {
            let booking_id = await this.createBookingId();
            let stops = body.stops || [];
            let otp = await this.generateOtp();
            let create_data = {
                request_type: body.request_type,
                sender_name: body.sender_name,
                sender_country_code: body.sender_country_code,
                sender_number: body.sender_number,
                receiver_name: body.receiver_name,
                receiver_country_code: body.receiver_country_code,
                receiver_number: body.receiver_number,
                parcel_details: body.parcel_details,
                customer_id: user_id,
                booking_id: booking_id,
                pickup_address: body.pickup_address,
                pickup_lat: body.pick_up_lat,
                pickup_long: body.pick_up_long,
                drop_address: body.drop_address,
                drop_lat: body.drop_lat,
                drop_long: body.drop_long,
                stops: stops,
                vehicle_id: body.vehicle_id,
                vehicle_name: body.vehicle_name,
                payment_method: body.payment_method,
                coupon_id: body.coupon_id,
                toll_price: toll_charges,
                base_fee: base_fee.toFixed(2),
                gst: calculation_data.gst_amount.toFixed(2),
                coupon_discount: coupon_amount.toFixed(2),
                total_amount: calculation_data.total_amount.toFixed(2),
                total_trip_amount: calculation_data.total_amount.toFixed(2),
                distance_in_km: distance,
                schedule_date: body.scheduled_date,
                booking_type: body.booking_type,
                filter: body.filter,
                base_fee_with_discount: base_fee_discount,
                surcharge_amount: calculation_data.surcharge_amount,
                waiting_charge_per_min: vehicle_pricing.stop_charges,
                ride_otp: otp,
                luggage: body.luggage,
                passenger: body.passenger,
                handbags: body.handbags,
                flight_number: body.flight_number,
                notes: body.notes,
                base_fee_without_addon: calculation_data.base_fee_without_addon,
                child_seat_charge: calculation_data.child_seat_charge,
                wheel_chair_charge: calculation_data.wheel_chair_charge,
                created_at: Date.now(),
                updated_at: moment().valueOf(),
                near_by_airport_charges: additional_fee,
                pending_booking_amount: calculation_data.pending_booking_amount,
                dispatcher_id,
                child_capsule_charge: calculation_data.child_capsule_charge,
                no_of_wheelchair: calculation_data?.no_of_wheelchair,
                no_of_childseat: calculation_data?.no_of_childseat,
                no_of_childcapsule: calculation_data?.no_of_childcapsule,
                gov_levy: calculation_data?.gov_levy,
                include_airport_toll: body.include_airport_toll,
                airport_toll: calculation_data?.airport_toll
            };
            const data = await this.model.booking.create(create_data);

            // create booking Activity

            this.activityService.logActivity({
                booking_id: data._id.toString(),
                userId: user_id,
                action: "CREATED",
                resource: "booking",
                description: "Booking Created",
                payload: { booking_type: body.booking_type }
            });

            // end 

            let config: any = await this.model.appConfiguration.findOne();
            let calculate_base_fee_for_driver = data?.base_fee - (data?.base_fee * 12 / 100);
            let airport_toll = (data.include_airport_toll) ? config?.airport_toll : 0;
            const amount_for_driver = calculate_base_fee_for_driver + airport_toll;

            await this.model.booking.findOneAndUpdate(
                { _id: data._id },
                { amount_for_driver: amount_for_driver }
            );


            console.log("new booking create", data);

            return data;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async create_booking_schedule(
        body,
        toll_charges,
        calculation_data,
        coupon_amount,
        company_id,
        distance,
        base_fee,
        base_fee_discount,
        vehicle_pricing,
        additional_fee,
        dispatcher_id?,
        user_id?,
        otp?
    ) {
        try {
            console.log('body', body)
            let booking_id = await this.createBookingId();
            let stops = body.stops || [];
            let ride_otp = await this.generateOtp();
            let create_data = {
                request_type: body.request_type,
                sender_name: body.sender_name,
                sender_country_code: body.sender_country_code,
                sender_number: body.sender_number,
                receiver_name: body.receiver_name,
                receiver_country_code: body.receiver_country_code,
                receiver_number: body.receiver_number,
                parcel_details: body.parcel_details,
                customer_id: user_id,
                company_id: company_id,
                booking_id: booking_id,
                pickup_address: body.pickup_address,
                pickup_lat: body.pick_up_lat,
                pickup_long: body.pick_up_long,
                drop_address: body.drop_address,
                drop_lat: body.drop_lat,
                drop_long: body.drop_long,
                stops: stops,
                toll_price: toll_charges,
                vehicle_id: body.vehicle_id,
                vehicle_name: body.vehicle_name,
                payment_method: body.payment_method,
                coupon_id: body.coupon_id,
                base_fee: base_fee.toFixed(2),
                gst: calculation_data.gst_amount.toFixed(2),
                gov_levy: calculation_data?.gov_levy,
                coupon_discount: coupon_amount.toFixed(2),
                total_amount: calculation_data.total_amount.toFixed(2),
                distance_in_km: distance,
                schedule_date: body.scheduled_date,
                booking_type: body.booking_type,
                filter: body.filter,
                flight_number: body.flight_number,
                notes: body.notes,
                base_fee_with_discount: base_fee_discount,
                surcharge_amount: calculation_data.surcharge_amount,
                waiting_charge_per_min: vehicle_pricing.stop_charges,
                ride_otp: otp || ride_otp,
                base_fee_without_addon: calculation_data?.base_fee_without_addon,
                luggage: body.luggage,
                passenger: body.passenger,
                handbags: body.handbags,
                child_seat_charge: calculation_data?.child_seat_charge,
                wheel_chair_charge: calculation_data?.wheel_chair_charge,
                child_capsule_charge: calculation_data?.child_capsule_charge,
                created_at: Date.now(),
                near_by_airport_charges: additional_fee,
                pending_booking_amount: calculation_data?.pending_booking_amount,
                dispatcher_id,
                total_trip_amount: calculation_data.total_trip_amount,
                no_of_wheelchair: calculation_data?.no_of_wheelchair,
                no_of_childseat: calculation_data?.no_of_childseat,
                no_of_childcapsule: calculation_data?.no_of_childcapsule,
                ...(body.invoice_number) && { invoice_number: body.invoice_number },
                ...(body.transaction_number) && { transaction_number: body.transaction_number },
                ...(body?.amount_for_driver) && { amount_for_driver: body.amount_for_driver },
                // ...(body?.total_amount) && { total_amount: body.total_amount },
                ...(body.include_airport_toll) && { airport_toll: 5.45 },
                ...(body.include_airport_toll) && { include_airport_toll: false },
                ...(body.company_passenger) && { company_passenger: body.company_passenger },
            };
            const data = await this.model.booking.create(create_data);

            // create booking Activity
            let dispatcherData = await this.model.admin.findOne({ _id: new Types.ObjectId(dispatcher_id), email: { $ne: 'admin@gmail.com' }, roles: { $in: [StaffRoles.dispatcher] } });

            this.activityService.logActivity({
                booking_id: data._id.toString(),
                userId: user_id,
                action: "CREATED",
                resource: "booking",
                description: "Booking Created - by Dispatcher " + dispatcherData?.name,
                payload: { booking_type: body.booking_type, function_name: "create_booking_schedule" }
            });
            // end 

            if (body?.total_amount) {
                data.total_amount = body.total_amount
                await data.save()
            }
            console.log("new booking create create_booking_schedule", data);

            return data;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async update_booking_schedule(
        booking_id,
        body,
        toll_charges,
        calculation_data,
        coupon_amount,
        company_id,
        distance,
        base_fee,
        base_fee_discount,
        vehicle_pricing,
        additional_fee,
        dispatcher_id?,
        otp?
    ) {
        try {
            // let booking_id = await this.createBookingId();
            let stops = body.stops || [];
            // let ride_otp = await this.generateOtp();
            let create_data: any = {
                request_type: body.request_type,
                sender_name: body.sender_name,
                sender_country_code: body.sender_country_code,
                sender_number: body.sender_number,
                receiver_name: body.receiver_name,
                receiver_country_code: body.receiver_country_code,
                receiver_number: body.receiver_number,
                parcel_details: body.parcel_details,
                // customer_id: user_id,
                company_id: company_id,
                // booking_id: booking_id,
                pickup_address: body.pickup_address,
                pickup_lat: body.pick_up_lat,
                pickup_long: body.pick_up_long,
                drop_address: body.drop_address,
                drop_lat: body.drop_lat,
                drop_long: body.drop_long,
                flight_number: body.flight_number,
                notes: body.notes,
                stops: stops,
                toll_price: toll_charges,
                vehicle_id: body.vehicle_id,
                vehicle_name: body.vehicle_name,
                payment_method: body.payment_method,
                coupon_id: body.coupon_id,
                base_fee: base_fee.toFixed(2),
                gst: calculation_data.gst_amount.toFixed(2),
                gov_levy: calculation_data?.gov_levy,
                coupon_discount: coupon_amount.toFixed(2),
                total_amount: calculation_data.total_amount.toFixed(2),
                distance_in_km: distance,
                schedule_date: body.scheduled_date,
                booking_type: body.booking_type,
                filter: body.filter,
                base_fee_with_discount: base_fee_discount,
                surcharge_amount: calculation_data.surcharge_amount,
                waiting_charge_per_min: vehicle_pricing.stop_charges,
                // ride_otp: otp || ride_otp,
                base_fee_without_addon: calculation_data?.base_fee_without_addon,
                luggage: body.luggage,
                passenger: body.passenger,
                handbags: body.handbags,
                child_seat_charge: calculation_data?.child_seat_charge,
                wheel_chair_charge: calculation_data?.wheel_chair_charge,
                child_capsule_charge: calculation_data?.child_capsule_charge,
                created_at: Date.now(),
                near_by_airport_charges: additional_fee,
                pending_booking_amount: calculation_data?.pending_booking_amount,
                dispatcher_id,
                total_trip_amount: calculation_data.total_trip_amount,
                no_of_wheelchair: calculation_data?.no_of_wheelchair,
                no_of_childseat: calculation_data?.no_of_childseat,
                no_of_childcapsule: calculation_data?.no_of_childcapsule,
                ...(body.invoice_number) && { invoice_number: body.invoice_number },
                ...(body.transaction_number) && { transaction_number: body.transaction_number },
                ...(body?.amount_for_driver) && { amount_for_driver: body.amount_for_driver },
                ...(body?.total_amount) && { total_amount: body.total_amount },
                ...(body?.company_passenger) && { company_passenger: body.company_passenger },
                is_broadcast_7_km: false,
                broadcasted_driver_ids: [],
            };

            let previous_data = await this.model.booking.findById(booking_id).lean();
            if (previous_data.payment_method == 'invoice') {
                let total_amount = previous_data.total_amount;
                if (total_amount < create_data.total_amount) {
                    create_data.pay_by_customer = create_data.total_amount - total_amount;
                } else if (total_amount > create_data.total_amount) {
                    create_data.pay_to_customer = total_amount - create_data.total_amount;
                }
            }

            const data = await this.model.booking.findByIdAndUpdate(booking_id, create_data, { new: true, lean: true });
            console.log("dispatcher booking updated", data);

            // Create booking Activity

            let dispatcherData = await this.model.admin.findOne({ _id: new Types.ObjectId(dispatcher_id), email: { $ne: 'admin@gmail.com' }, roles: { $in: [StaffRoles.dispatcher] } });

            this.activityService.logActivity({
                booking_id: booking_id.toString(),
                userId: company_id,
                action: "BOOKING_UPDATE_DIS",
                resource: "booking",
                description: "Booking updated - by Dispatcher " + dispatcherData?.name,
                payload: { booking_id: booking_id, company_id: company_id }
            });

            // End

            return data;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async create_booking_schedule_for_web_app(
        body,
        toll_charges,
        calculation_data,
        coupon_amount,
        company_id,
        distance,
        base_fee,
        base_fee_discount,
        vehicle_pricing,
        additional_fee,
        otp,
        customer
    ) {
        try {
            let booking_id = await this.createBookingId();
            let stops = body.stops || [];
            let create_data = {
                request_type: "ride",
                is_guest: true,
                sender_name: body.sender_name,
                sender_country_code: body.sender_country_code,
                sender_number: body.sender_number,
                receiver_name: body.receiver_name,
                receiver_country_code: body.receiver_country_code,
                receiver_number: body.receiver_number,
                parcel_details: body.parcel_details,
                customer_id: customer._id,
                company_id: company_id,
                booking_id: booking_id,
                pickup_address: body.pickup_address,
                pickup_lat: body.pick_up_lat,
                pickup_long: body.pick_up_long,
                drop_address: body.drop_address,
                drop_lat: body.drop_lat,
                drop_long: body.drop_long,
                stops: stops,
                toll_price: toll_charges,
                vehicle_id: body.vehicle_id,
                vehicle_name: body.vehicle_name,
                payment_method: body.payment_method,
                coupon_id: body.coupon_id,
                base_fee: base_fee.toFixed(2),
                gst: calculation_data.gst_amount.toFixed(2),
                coupon_discount: coupon_amount.toFixed(2),
                total_amount: calculation_data.total_amount.toFixed(2),
                distance_in_km: distance,
                schedule_date: body.scheduled_date,
                booking_type: body.booking_type,
                flight_number: body.flight_number,
                notes: body.notes,
                filter: body.filter,
                base_fee_with_discount: base_fee_discount,
                surcharge_amount: calculation_data.surcharge_amount,
                waiting_charge_per_min: vehicle_pricing.stop_charges,
                ride_otp: otp,
                base_fee_without_addon: calculation_data?.base_fee_without_addon,
                luggage: body.luggage,
                passenger: body.passenger,
                handbags: body.handbags,
                child_seat_charge: calculation_data.child_seat_charge,
                wheel_chair_charge: calculation_data.wheel_chair_charge,
                created_at: Date.now(),
                near_by_airport_charges: additional_fee,
                pending_booking_amount: calculation_data.pending_booking_amount,
                total_trip_amount: calculation_data.total_trip_amount,
                gov_levy: calculation_data?.gov_levy, airport_toll: calculation_data?.airport_toll,
                child_capsule_charge: calculation_data.child_capsule_charge,
                no_of_wheelchair: calculation_data?.no_of_wheelchair,
                no_of_childseat: calculation_data?.no_of_childseat,
                no_of_childcapsule: calculation_data?.no_of_childcapsule,
                // status : "scheduled"
            };
            const data = await this.model.booking.create(create_data);

            // create booking Activity

            this.activityService.logActivity({
                booking_id: data._id.toString(),
                userId: customer._id,
                action: "CREATED",
                resource: "booking",
                description: "Booking Created",
                payload: { booking_type: body.booking_type }
            });

            // end 

            try {
                let config: any = await this.model.appConfiguration.findOne();
                let calculate_base_fee_for_driver = data?.base_fee - (data?.base_fee * 12 / 100);
                let airport_toll = (data.include_airport_toll) ? config?.airport_toll : 0;
                const amount_for_driver = calculate_base_fee_for_driver + airport_toll;

                await this.model.booking.findOneAndUpdate(
                    { _id: data._id },
                    { amount_for_driver: amount_for_driver }
                );

            } catch (error) {

            }
            console.log("new booking create create_booking_schedule_for_web_app ", data);

            return data;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async generateOtp() {
        try {
            return Math.floor(1000 + Math.random() * 9000);
        } catch (error) {
            throw error;
        }
    }

    createBookingId(): string {
        // Generate a unique UUID
        const uniqueId = uuidv4();

        // Extract the numeric part from the UUID and limit it to 7 digits
        const numericPart = parseInt(uniqueId.replace(/\D/g, ""), 10);
        const sevenDigitNumber = ("0000000" + (numericPart % 10000000)).slice(
            -7
        );

        // Concatenate the prefix "ct" with the unique UUID
        const customUniqueId = `CB${sevenDigitNumber}`;

        return customUniqueId;
    }

    async send_push_to_nearest_drivers(data, customer) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(data, 'INNNNNNNNNNNNNNNNNNN :: <----data in send_push_to_nearest_drivers ');
                while (true) {
                    // Step 1: Find drivers within a 5km radius
                    let booking;
                    console.log('<----we are here to find driver step 1 ----->');

                    const driverId: any =
                        await this.find_drivers_under_5km_radius(
                            data.pickup_lat,
                            data.pickup_long,
                            data.vehicle_id,
                            data._id,
                            data?.no_of_childcapsule,
                            data?.no_of_childseat,
                            data?.no_of_wheelchair,
                            data?.updated_at,
                            customer
                        );

                    console.log(driverId, '<-------driverId');
                    if (!driverId) break;

                    booking = await this.model.booking.findOne({
                        _id: data._id,

                    })
                        .select("-sender_country_code -receiver_name -receiver_country_code -receiver_number -parcel_details -pickup_lat -pickup_long -drop_lat -drop_long -stops -is_stop1_charge_noti_send -is_stop2_charge_noti_send -rate_by_customer -rate_by_driver") // Exclude the unwanted fields
                        .populate([
                            { path: "customer_id", select: " name email country_code phone image " },
                            { path: "driver_id", select: " name email country_code phone image " },
                            { path: "vehicle_id" },
                            { path: "vehicleDetail_id" }
                        ]);
                    let key_1 = "send_booking_req_title";
                    let key_2 = "send_booking_req_description";

                    const send_booking_req_title =
                        await this.commonService.localization(
                            driverId?.preferred_language ?? "english",
                            key_1
                        );
                    const send_booking_req_description =
                        await this.commonService.localization(
                            driverId?.preferred_language ?? "english",
                            key_2
                        );

                    const find_driver_fcm_token =
                        await this.model.sessions.findOne(
                            { user_id: driverId?._id, scope: "driver" },
                            { fcm_token: 1, device_type: 1 }
                        );

                    if (find_driver_fcm_token) {
                        console.log("title.......................", send_booking_req_title[
                            driverId.preferred_language
                        ]);

                        console.log("descriptiom.......................", send_booking_req_description[
                            driverId.preferred_language
                        ]);

                        // let pushData = {
                        //     title: send_booking_req_title[
                        //         driverId.preferred_language
                        //     ],
                        //     message:
                        //         send_booking_req_description[
                        //         driverId.preferred_language
                        //         ],
                        // };

                        const pushData = {
                            title: send_booking_req_title[
                                driverId.preferred_language
                            ],
                            message: `Date/Time: ${momentTz(booking.created_at).tz(process.env.APP_TIMEZONE || 'Australia/Sydney').format('DD/MM/YYYY HH:mm')}
Pickup: ${booking.pickup_address}
Drop-off: ${booking.drop_address}
Trip price: $${booking.amount_for_driver}`,
                        };

                        let config: any = await this.model.appConfiguration.findOne();
                        let calculate_base_fee_for_driver = booking?.base_fee - (booking?.base_fee * driverId?.commission / 100);
                        let airport_toll = (booking.include_airport_toll) ? config?.airport_toll : 0;
                        const amount_for_driver = calculate_base_fee_for_driver + airport_toll;
                        booking.amount_for_driver = amount_for_driver;

                        let data_push = {
                            booking: booking,
                            type: "booking_request",
                            generated_at: Date.now(),
                        };

                        console.log("send req to............................ ", driverId);

                        try {
                            // find_driver_fcm_token.device_type === "ios" ? await this.notification.send_apn_notification(
                            //     pushData,
                            //     String(find_driver_fcm_token.fcm_token),
                            //     data_push
                            // ) : 
                            await this.notification.send_notification(
                                pushData,
                                find_driver_fcm_token?.fcm_token,
                                data_push,
                                find_driver_fcm_token?.device_type
                            );
                        } catch (error) {
                            console.log(error, "notificaiton fail---->");

                        }


                        await this.model.drivers.updateOne(
                            { _id: driverId._id },
                            {
                                currently_send_ride_request: true,
                                currently_send_ride_request_id: booking._id,
                                currently_send_ride_request_generate_at:
                                    Date.now(),
                            }
                        );

                        let existingNotification =
                            await this.model.booking_notifications.findOne({
                                booking_id: data._id,
                            });

                        console.log(existingNotification, '<--------existingNotification');

                        if (existingNotification) {
                            console.log(driverId._id, '<----driverId._id');

                            existingNotification.driver_ids.push(driverId._id);
                            await existingNotification.save(); // Save the updated document
                        } else {
                            const newNotification =
                                await this.model.booking_notifications.create({
                                    booking_id: data._id,
                                    driver_ids: [driverId._id],
                                });
                        }
                        let driverAcceptedOrDeclined = false;
                        for (let i = 0; i <= 29; i++) {
                            // Check the driver's response
                            await new Promise((resolve) =>
                                setTimeout(resolve, 1000)
                            );

                            const response =
                                await this.model.declined_bookings.findOne({
                                    driver_id: driverId._id,
                                    booking_id: data._id,
                                });

                            const booking = await this.model.booking.findOne({
                                _id: data._id,
                            });
                            if (
                                booking.booking_status ===
                                BookingStatus.Cancelled
                            ) {
                                resolve("accepted");
                                return { message: "You cancel the request" };
                            }
                            if (response) {
                                if (response.status === "accepted") {
                                    console.log(
                                        "accepted........................."
                                    );

                                    await this.model.drivers.updateOne(
                                        { _id: driverId._id },
                                        {
                                            currently_send_ride_request: false,
                                            currently_send_ride_request_id:
                                                null,
                                            currently_send_ride_request_generate_at:
                                                null,
                                        }
                                    );
                                    resolve("accepted");
                                    return {
                                        message: "Your request is accepted ",
                                    };
                                } else if (response.status === "decline") {
                                    await this.model.drivers.updateOne(
                                        { _id: driverId._id },
                                        {
                                            currently_send_ride_request: false,
                                            currently_send_ride_request_id:
                                                null,
                                            currently_send_ride_request_generate_at:
                                                null,
                                        }
                                    );
                                    driverAcceptedOrDeclined = true;
                                    break;
                                }
                            }
                        }
                        if (!driverAcceptedOrDeclined) {
                            await this.model.drivers.updateOne(
                                { _id: driverId._id },
                                {
                                    currently_send_ride_request: false,
                                    currently_send_ride_request_id: null,
                                    currently_send_ride_request_generate_at:
                                        null,
                                }
                            );
                        }
                    } else {
                        let existingNotification =
                            await this.model.booking_notifications.findOne({
                                booking_id: data._id,
                            });
                        if (existingNotification) {
                            existingNotification.driver_ids.push(driverId?._id);
                            await existingNotification.save(); // Save the updated document
                        } else {
                            await this.model.booking_notifications.create({
                                booking_id: data._id,
                                driver_ids: [driverId?._id],
                            });
                        }
                    }
                }
            } catch (error) {
                console.log("error", error);
                reject(error);
            }
        });
    }

    async find_booking_with_id(id) {
        try {
            const booking: any = await this.model.booking
                .findOne({ _id: id })
                .populate([
                    { path: "customer_id" },
                    { path: "driver_id" },
                    { path: "vehicle_id" },
                    { path: "vehicleDetail_id" },
                ]);

            return booking;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async findBookingWithSocket(id, payload) {
        try {
            let user;
            let booking;
            if (payload.scope === "customer") {
                user = await this.model.customers.findOne({
                    _id: payload.user_id,
                });
            } else {
                user = await this.model.drivers.findOne({
                    _id: payload.user_id,
                });
            }

            if (user.preferred_currency === "USD") {
                booking = await this.model.booking
                    .findOne({ _id: id })
                    .populate([
                        { path: "customer_id" },
                        { path: "driver_id" },
                        { path: "vehicle_id" },
                        { path: "vehicleDetail_id" },
                    ]);
            } else {
                let booking_data: any = await this.model.booking
                    .findOne({ _id: id })
                    .populate([
                        { path: "customer_id" },
                        { path: "driver_id" },
                        { path: "vehicle_id" },
                        { path: "vehicleDetail_id" },
                    ]);

                // let convertcurrencydata = {
                //     base_fee: booking_data.base_fee,
                //     base_fee_with_discount:
                //         booking_data.base_fee_with_discount || 0,
                //     toll_charge: booking_data.toll_price,

                //     coupon_discount: booking_data.coupon_discount,
                //     gst: booking_data.gst,
                //     total_amount: booking_data.total_amount,
                //     waiting_charge: booking_data.stop_charges,
                //     tip: booking_data.tip_driver,
                // };

                // const response = await this.convert_currency_get_booking(
                //     user.preferred_currency,
                //     convertcurrencydata
                // );

                booking = {
                    ...booking_data._doc,
                    base_fee: booking_data.base_fee,
                    total_amount: booking_data.total_amount,
                    gst: booking_data.gst,
                    coupon_discount: booking_data.coupon_discount,
                    stop_charges: booking_data.stop_charges,
                    base_fee_with_discount: booking_data.base_fee_with_discount || 0,
                    toll_price: booking_data.toll_price,
                    tip_driver: booking_data.tip_driver,
                };
            }
            return booking;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async findBookingWithSocketForDriver(id) {
        try {
            let booking;

            let booking_data: any = await this.model.booking
                .findOne({ _id: id })
                .populate([
                    { path: "customer_id" },
                    { path: "driver_id" },
                    { path: "vehicle_id" },
                    { path: "vehicleDetail_id" },
                ]);

            let user = await this.model.drivers.findOne({
                _id: booking_data.driver_id._id,
            });
            if (user.preferred_currency === "USD") {
                booking = await this.model.booking
                    .findOne({ _id: id })
                    .populate([
                        { path: "customer_id" },
                        { path: "driver_id" },
                        { path: "vehicle_id" },
                        { path: "vehicleDetail_id" },
                    ]);
            } else {
                // let convertcurrencydata = {
                //     base_fee: booking_data.base_fee,
                //     base_fee_with_discount: booking_data.base_fee_with_discount,
                //     toll_charge: booking_data.toll_price,

                //     coupon_discount: booking_data.coupon_discount,
                //     gst: booking_data.gst,
                //     total_amount: booking_data.total_amount,
                //     waiting_charge: booking_data.stop_charges,
                //     tip: booking_data.tip_driver,
                // };

                // const response = await this.convert_currency_get_booking(
                //     user.preferred_currency,
                //     convertcurrencydata
                // );

                // booking = {
                //     ...booking_data._doc,
                //     base_fee: response.convertedBaseFee,
                //     total_amount: response.convertedTotalAmount,
                //     gst: response.convertedGstAmount,
                //     coupon_discount: response.convertedCouponAmount,
                //     stop_charges: response.convertedStopCharges,
                //     base_fee_with_discount:
                //         response.convertedBaseFeeWithDiscount,
                //     toll_price: response.convertedTollCharge,
                //     tip_driver: response.convertedTipAmount,
                // };

                booking = {
                    ...booking_data._doc,
                    base_fee: booking_data.base_fee,
                    total_amount: booking_data.total_amount,
                    gst: booking_data.gst,
                    coupon_discount: booking_data.coupon_discount,
                    stop_charges: booking_data.stop_charges,
                    base_fee_with_discount: booking_data.base_fee_with_discount,
                    toll_price: booking_data.toll_price,
                    tip_driver: booking_data.tip_driver,
                };
            }

            return booking;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async update_booking_with_id(id, data) {
        try {
            await this.model.booking.updateOne({ _id: id }, data);
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }



    async fetch_fcm_token(customer_id) {
        try {
            const data = await this.model.sessions.find(
                { user_id: new mongoose.Types.ObjectId(customer_id) },
                { fcm_token: 1 }
            );
            return data;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async scheduled_Booking_noti() {
        try {

            const all_driver = await this.model.drivers.find(
                { latitude: { $ne: null } },
                { _id: 1, latitude: 1, longitude: 1 }
            ).lean();

            for (const driver of all_driver) {
                const lat = parseFloat(driver.latitude);
                const lng = parseFloat(driver.longitude);

                // console.log('driver._id', driver._id, lat, lng)

                if (!isNaN(lat) && !isNaN(lng)) {
                    await this.model.drivers.updateOne(
                        { _id: driver._id },
                        {
                            $set: {
                                location: {
                                    type: "Point",
                                    coordinates: [lng, lat], // Note: [longitude, latitude]
                                },
                            },
                        }
                    );
                }
            }

            const scheduled_bookings = await this.model.booking.find({
                booking_status: { $nin: [BookingStatus.Completed, BookingStatus.Ongoing, BookingStatus.Failed, BookingStatus.Cancelled, BookingStatus.Accept] },
                schedule_date: { $ne: null },
                booking_type: BookingType.Schedule,
                $or: [
                    { payment_success: true },
                    { dispatcher_id: { $ne: null } },
                    { company_id: { $ne: null } }
                ],
                driver_id: null, // drivers not assigned
            });

            const dispatcher_bookings = await this.model.booking.find({
                booking_status: BookingStatus.Accept,
                schedule_date: { $ne: null },
            });

            const currentTime: any = moment().valueOf();
            for (const booking of scheduled_bookings) {
                const timeDifference: any = moment(+booking?.schedule_date).diff(currentTime, "minute")
                // console.log(timeDifference, '<----timeDifference for driver available');

                if (timeDifference <= 30 && !booking.is_dispatcher_notified) {
                    const payload = {
                        title: `Urgent Action Required! `, message: `A scheduled booking has no driver assigned. Please assign a driver immediately! 🚗.`
                    }
                    this.notifyDispatcher(payload, true, null, booking)
                    await this.model.booking.findByIdAndUpdate(booking?._id, { is_dispatcher_notified: true })
                }
                await this.broadcasting(booking)
            }

            for (const dispatchBookings of dispatcher_bookings) {
                // const timeDifference: any = ((dispatchBookings.schedule_date - currentTime) / 1000 / 60).toFixed(2); // difference in minutes
                const timeDifference = ((dispatchBookings.schedule_date - currentTime) / 1000 / 60); // in minutes

                // if (timeDifference <= 15 && dispatchBookings.sent_dispatch_noti === false) {
                if (timeDifference >= -5 && timeDifference <= 15 && dispatchBookings.sent_dispatch_noti === false) {
                    console.log("✅ Condition matched: schedule is between 5 minutes ago and 15 minutes ahead");
                    await this.model.booking.updateOne(
                        { _id: dispatchBookings._id },
                        {
                            sent_dispatch_noti: true,
                            is_ride_started: true,
                        }
                    );
                    let driver = await this.model.drivers.findOne({
                        _id: dispatchBookings.driver_id,
                    });
                    let fcm_token = await this.model.sessions.find({
                        user_id: dispatchBookings.driver_id,
                    });
                    let cust_fcm_token = await this.model.sessions.find({
                        user_id: dispatchBookings.customer_id,
                    });

                    if (driver.ride_status === ride_status.free) {
                        await this.model.drivers.updateOne(
                            { _id: dispatchBookings.driver_id },
                            {
                                current_booking: dispatchBookings._id,
                                ride_status: ride_status.busy,
                            }
                        );
                        await this.model.customers.updateOne(
                            { _id: dispatchBookings.customer_id },
                            { current_booking: dispatchBookings._id }
                        );

                        const scheduleTime = moment(dispatchBookings?.schedule_date).diff(currentTime, 'minute')
                        for (const fcmToken of cust_fcm_token) {
                            let pushDataForCust = {
                                title: "Time to Start Your Ride!",
                                message:
                                    `Your ride is scheduled to start in ${scheduleTime} minutes. Please prepare to begin the trip.`,
                            };
                            let data_pushForCust = {
                                type: "dispatcher_request",
                                booking: dispatchBookings,
                            };

                            try {
                                await this.notification.send_notification(
                                    pushDataForCust,
                                    fcmToken.fcm_token,
                                    data_pushForCust
                                );
                            } catch (error) {
                                console.log(error, "notificaiton fail---->");
                            }

                        }
                        for (const fcmToken of fcm_token) {
                            let pushData = {
                                title: "Your Ride is Starting Soon!",
                                message:
                                    "Your driver will begin the trip in 15 minutes. Please be ready at the pickup location.",
                            };
                            let data_push = {
                                type: "dispatcher_request",
                                booking: dispatchBookings,
                            };

                            try {
                                await this.notification.send_notification(
                                    pushData,
                                    fcmToken.fcm_token,
                                    data_push
                                );
                            } catch (error) {
                                console.log(error, "notificaiton fail---->");
                            }
                        }

                        await this.model.booking.updateOne(
                            { _id: dispatchBookings._id },
                            {
                                is_ride_started: true,
                                booking_type: BookingType.Current,
                            }
                        );
                    } else {
                        for (const fcmToken of fcm_token) {
                            let pushData = {
                                title: "Time to Start Your Ride!",
                                message:
                                    "Your ride is scheduled to start in 15 minutes. Please prepare to begin the trip.",
                            };

                            let data_push = {
                                type: "assign_booking",
                            };

                            try {
                                await this.notification.send_notification(
                                    pushData,
                                    fcmToken.fcm_token,
                                    data_push
                                );
                            } catch (error) {
                                console.log(error, "notificaiton fail---->");
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async broadcasting(booking) {
        try {

            const tttttttttttttt = moment(booking.schedule_date).format('lll')
            console.log('broadcasting tttttttttttttt', booking.booking_id, tttttttttttttt)
            const currentTime: any = +new Date();
            const timeDifference: any = (
                (booking.schedule_date - currentTime) /
                1000 /
                60
            ).toFixed(2); // difference in minutes

            // console.log(timeDifference, '<-------timeDifference from broadcast bookings');

            const booking_data: any = await this.model.booking
                .findOne({ _id: booking._id })
                .populate([
                    { path: "customer_id", select: " name email country_code phone image " },
                    { path: "driver_id", select: " name email country_code phone image " },
                    { path: "vehicle_id" },
                    { path: "company_id", select: "name email country_code phone_no created_at" },
                    { path: "vehicleDetail_id" }
                ]);
            // console.log(currentTime >= booking.schedule_date, '<------is booking time exeeded');
            // console.log(currentTime, '<---currentTime', booking.schedule_date, '<---booking booking time ');
            const fiveMinAdd = moment(booking.schedule_date).add(5, 'minute').valueOf()
            console.log("kdklsfdjjjjjjjjjjjjjjjjjjjjj +5 MINUTES::::", booking.booking_id, "==>", moment(fiveMinAdd).format('lll'))
            if (currentTime >= booking.schedule_date) {
                console.log("INNNNNNNNNNNSIDE")
                if (currentTime >= fiveMinAdd) {

                    // create booking Activity

                    this.activityService.logActivity({
                        booking_id: booking?._id.toString(),
                        userId: booking?.customer_id,
                        action: "BOOKING_FAILED",
                        resource: "booking",
                        description: "Booking failed - Due to unavailability of driver and schedule time passed",
                        payload: { booking_type: BookingType.Schedule, driver_id: booking?.customer_id }
                    });

                    // end


                    const bookingData = await this.model.booking.findOneAndUpdate(
                        { _id: booking._id },
                        { booking_status: BookingStatus.Failed },
                        { new: true }
                    );
                    const scope = { scope: "failed" }
                    if (bookingData.payment_method != 'invoice') {
                        this.cancelRefund(bookingData, scope);
                    }

                    console.log(booking.customer_id, '<-----booking.customer_id')
                    const fcm_token = await this.model.sessions.find({
                        user_id: booking.customer_id,
                    });
                    console.log(fcm_token, '<----fcm_token');

                    await this.model.customers.updateOne(
                        { _id: booking.customer_id },
                        { current_booking: null }
                    );
                    try {
                        let data = await this.socket_booking_accepted(String(booking._id))
                        console.log(data, '<----from socket_booking_accepted');

                        const { socketIds, booking_details }: any = data
                        socketIds.forEach((socketId) => {
                            this.server.to(socketId).emit("socket_booking_accepted", { booking: booking_details });
                        });
                    } catch (error) {
                        console.log("socket failed ===> ", error);
                    }
                    await this.model.drivers.updateMany(
                        { currently_send_ride_request_id: booking?._id },
                        {
                            currently_send_ride_request_id: null,
                            currently_send_ride_request: false,
                            currently_send_ride_request_generate_at: null
                        }
                    );
                    let customer_detail = await this.model.customers.findOne({
                        _id: booking.customer_id,
                    });
                    let pushData;
                    for (let fcmToken of fcm_token) {
                        if (
                            customer_detail?.preferred_language === "english"
                        ) {
                            pushData = {
                                title: "No Available Drivers Nearby",
                                message:
                                    "We’re sorry, but we couldn't find a driver at this moment. Please try again in a few minutes.",
                            };
                        } else {
                            pushData = {
                                title: "आसपास कोई उपलब्ध ड्राइवर नहीं",
                                message:
                                    "हमें खेद है, लेकिन इस समय कोई ड्राइवर नहीं मिल सका। कृपया कुछ मिनटों बाद पुनः प्रयास करें।",
                            };
                        }
                        let data_push = {
                            booking: booking,
                            type: "driver_not_available",
                        };

                        console.log(fcmToken.fcm_token, '<-----fcmToken.fcm_token');


                        try {
                            await this.notification.send_notification(
                                pushData,
                                fcmToken.fcm_token,
                                data_push
                            );
                        } catch (error) {
                            console.log(error, "notificaiton fail---->");

                        }

                    }
                    throw new HttpException(
                        {
                            error_code: "DRIVER_NOT_AVAILABLE",
                            error_description: "Driver not available",
                        },
                        HttpStatus.BAD_REQUEST
                    );
                }

                // create booking Activity

                this.activityService.logActivity({
                    booking_id: booking?._id.toString(),
                    userId: booking?.customer_id,
                    action: "BOOKING_PAYMENT",
                    resource: "booking",
                    description: "Booking auto-broadcasted successfully",
                    payload: { booking_type: BookingType.Schedule, driver_id: booking?.customer_id }
                });

                // end
                this.sent_broadcast_request(booking_data, "Auto");

                let data = {
                    booking_type: BookingType.Current,
                };
                await this.update_booking_with_id(booking._id, data);
                await this.model.customers.updateOne(
                    { _id: booking.customer_id },
                    { current_booking: booking._id }
                );
                return;
            }

            if (timeDifference <= 30 && timeDifference > 25 && !booking_data.is_broadcast_7_km) {
                if (booking.is_currently_broadcasting === true) {
                    return
                }

                await this.model.booking.findOneAndUpdate(
                    { _id: booking._id },
                    { $set: { is_currently_broadcasting: true, broadcasted_driver_ids: [], is_broadcast_7_km: true } },
                    { new: true }
                );

                console.log("INSIDE :: Between 30 and 25 minutes left");
                console.log("BOOKING DATA ::", booking_data._id);

                await this.activityService.logActivity({
                    booking_id: booking?._id.toString(),
                    userId: booking?.customer_id,
                    action: "BOOKING_BROADCAST",
                    resource: "booking",
                    description: "Searching for available drivers within a 7 km radius",
                    payload: { booking_type: BookingType.Schedule },
                });

                await this.sent_broadcast_request_under_7_km(booking_data, "Auto");    //without upgrade

                await this.model.booking.findOneAndUpdate(
                    { _id: booking._id },
                    { $set: { is_broadcast_7_km: true, is_currently_broadcasting: false } },
                    { new: true }
                );

                await this.model.customers.updateOne(
                    { _id: booking.customer_id },
                    { current_booking: booking._id }
                );
            }

            if (timeDifference <= 25 && !booking_data.is_broadcast) {

                console.log("OUTSIDEESIDE")

                console.log("booking_data......................", booking_data._id);

                // create booking Activity

                this.activityService.logActivity({
                    booking_id: booking?._id.toString(),
                    userId: booking?.customer_id,
                    action: "BOOKING_PAYMENT",
                    resource: "booking",
                    description: "Booking auto broadcasted successfully ",
                    payload: { booking_type: BookingType.Schedule, driver_id: booking?.customer_id }
                });

                // end

                this.sent_broadcast_request(booking_data, "Auto");

                let data = {
                    // booking_type: BookingType.Current,
                    is_broadcast: true
                };
                await this.update_booking_with_id(booking._id, data);
                await this.model.customers.updateOne(
                    { _id: booking.customer_id },
                    { current_booking: booking._id }
                );
            }
        } catch (error) {
            console.log(error, '<----from broadcasting start--->');
            throw error
        }
    }

    // async convert_currency(currency, data) {
    //     try {
    //         const conversion_rate = await axios.get(
    //             "https://api.exchangerate-api.com/v4/latest/usd"
    //         );

    //         const exchangeRates = conversion_rate?.data?.rates;

    //         if (!exchangeRates[currency]) {
    //             throw new Error("Currency not supported");
    //         }
    //         let conversionRate = exchangeRates[currency];
    //         let convertedBaseFee = parseFloat(
    //             (data.base_fee * conversionRate).toFixed(2)
    //         );
    //         let convertedTotalAmount = parseFloat(
    //             (data.total_amount * conversionRate).toFixed(2)
    //         );
    //         let convertedGstAmount = parseFloat(
    //             (data.gst * conversionRate).toFixed(2)
    //         );
    //         let convertedCouponAmount = parseFloat(
    //             (data.coupon_discount * conversionRate).toFixed(2)
    //         );
    //         let convertedStopCharges = parseFloat(
    //             (data.waiting_charge * conversionRate).toFixed(2)
    //         );

    //         let response = {
    //             convertedBaseFee: convertedBaseFee,
    //             convertedCouponAmount: convertedCouponAmount,
    //             convertedGstAmount: convertedGstAmount,
    //             convertedTotalAmount: convertedTotalAmount,
    //             convertedStopCharges: convertedStopCharges,
    //         };
    //         return response;
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    // async convert_currency_get_booking(currency, data) {
    //     try {
    //         const conversion_rate = await axios.get(
    //             "https://api.exchangerate-api.com/v4/latest/usd"
    //         );

    //         const exchangeRates = conversion_rate.data.rates;

    //         if (!exchangeRates[currency]) {
    //             throw new Error("Currency not supported");
    //         }
    //         let conversionRate = exchangeRates[currency];
    //         let convertedBaseFee = parseFloat(
    //             (data.base_fee * conversionRate).toFixed(2)
    //         );
    //         let convertedTotalAmount = parseFloat(
    //             (data.total_amount * conversionRate).toFixed(2)
    //         );
    //         let convertedGstAmount = parseFloat(
    //             (data.gst * conversionRate).toFixed(2)
    //         );
    //         let convertedCouponAmount = parseFloat(
    //             (data.coupon_discount * conversionRate).toFixed(2)
    //         );
    //         let convertedStopCharges = parseFloat(
    //             (data.waiting_charge * conversionRate).toFixed(2)
    //         );

    //         let convertedBaseFeeWithDiscount = parseFloat(
    //             (data.base_fee_with_discount * conversionRate).toFixed(2)
    //         );

    //         let convertedTollCharge = parseFloat(
    //             (data.toll_charge * conversionRate).toFixed(2)
    //         );

    //         let convertedTipAmount = parseFloat(
    //             (data.tip * conversionRate).toFixed(2)
    //         );
    //         let convertedSurchargeAmount = parseFloat(
    //             (data.surcharge_amount * conversionRate).toFixed(2)
    //         );

    //         let response = {
    //             convertedBaseFee: convertedBaseFee,
    //             convertedCouponAmount: convertedCouponAmount,
    //             convertedGstAmount: convertedGstAmount,
    //             convertedTotalAmount: convertedTotalAmount,
    //             convertedStopCharges: convertedStopCharges,
    //             convertedBaseFeeWithDiscount: convertedBaseFeeWithDiscount,
    //             convertedTollCharge: convertedTollCharge,
    //             convertedTipAmount: convertedTipAmount,
    //             convertedSurchargeAmount: convertedSurchargeAmount,
    //         };
    //         return response;
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    // async convert_currency_for_driver_wallet(currency, data) {
    //     try {
    //         const conversion_rate = await axios.get(
    //             "https://api.exchangerate-api.com/v4/latest/usd"
    //         );

    //         const exchangeRates = conversion_rate.data.rates;

    //         if (!exchangeRates[currency]) {
    //             throw new Error("Currency not supported");
    //         }
    //         let conversionRate = exchangeRates[currency];
    //         let convertedTipsFromRider = parseFloat(
    //             (data.tips_from_rider * conversionRate).toFixed(2)
    //         );
    //         let convertedTotalTripsAmount = parseFloat(
    //             (data.total_trips_amount * conversionRate).toFixed(2)
    //         );
    //         let convertedAmountToBePaid = parseFloat(
    //             (data.amount_to_be_paid * conversionRate).toFixed(2)
    //         );
    //         let convertedAppCommission = parseFloat(
    //             (data.app_commission * conversionRate).toFixed(2)
    //         );
    //         let convertedTotalAmountToBePaid = parseFloat(
    //             (data.total_amount_to_be_paid * conversionRate).toFixed(2)
    //         );

    //         let convertedYouNeedToPay = parseFloat(
    //             (data.you_need_to_pay * conversionRate).toFixed(2)
    //         );

    //         let convertedCashYouHave = parseFloat(
    //             (data.cash_you_have * conversionRate).toFixed(2)
    //         );

    //         let response = {
    //             convertedTipsFromRider: convertedTipsFromRider,
    //             convertedTotalTripsAmount: convertedTotalTripsAmount,
    //             convertedAmountToBePaid: convertedAmountToBePaid,
    //             convertedAppCommission: convertedAppCommission,
    //             convertedYouNeedToPay: convertedYouNeedToPay,
    //             convertedCashYouHave: convertedCashYouHave,
    //             convertedTotalAmountToBePaid: convertedTotalAmountToBePaid,
    //         };
    //         return response;
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    // async convert_payment_amount(currency, payment_amount) {
    //     try {
    //         let currency_to_chnge = "USD";
    //         const conversion_rate = await axios.get(
    //             "https://api.exchangerate-api.com/v4/latest/INR"
    //         );

    //         const exchangeRates = conversion_rate.data.rates;

    //         if (!exchangeRates[currency_to_chnge]) {
    //             throw new Error("Currency not supported");
    //         }
    //         let conversionRate = exchangeRates[currency_to_chnge];
    //         let convertedPaymentAmount =
    //             Math.round(payment_amount * conversionRate * 100) / 100;

    //         return convertedPaymentAmount;
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    // async convert_payment_amount_for_booking(currency, payment_amount) {
    //     try {
    //         const conversion_rate = await axios.get(
    //             "https://api.exchangerate-api.com/v4/latest/USD"
    //         );

    //         const exchangeRates = conversion_rate.data.rates;

    //         if (!exchangeRates[currency]) {
    //             throw new Error("Currency not supported");
    //         }
    //         let conversionRate = exchangeRates[currency];
    //         let convertedPaymentAmount =
    //             Math.round(payment_amount * conversionRate * 100) / 100;

    //         return convertedPaymentAmount;
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    // async convert_wallet_amount_listing(currency, payment_amount) {
    //     try {
    //         const conversion_rate = await axios.get(
    //             "https://api.exchangerate-api.com/v4/latest/usd"
    //         );
    //         const exchangeRates = conversion_rate.data.rates;
    //         if (!exchangeRates[exchangeRates]) {
    //             throw new Error("Currency not supported");
    //         }
    //         let conversionRate = exchangeRates[exchangeRates];
    //         let convertedPaymentAmount = parseFloat(
    //             (payment_amount * conversionRate).toFixed(2)
    //         );
    //         return convertedPaymentAmount;
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    // async convert_wallet_amount(currency, payment_amount) {
    //     try {
    //         const conversion_rate = await axios.get(
    //             "https://api.exchangerate-api.com/v4/latest/usd"
    //         );
    //         const exchangeRates = conversion_rate.data.rates;
    //         if (!exchangeRates[currency]) {
    //             throw new Error("Currency not supported");
    //         }
    //         let conversionRate = exchangeRates[currency];
    //         let convertedPaymentAmount = parseFloat(
    //             (payment_amount * conversionRate).toFixed(2)
    //         );
    //         return convertedPaymentAmount;
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    // async convert_coupon_amount(
    //     currency,
    //     payment_amount,
    //     minimum_booking_amount
    // ) {
    //     try {
    //         const conversion_rate = await axios.get(
    //             "https://api.exchangerate-api.com/v4/latest/usd"
    //         );
    //         const exchangeRates = conversion_rate.data.rates;
    //         if (!exchangeRates[currency]) {
    //             throw new Error("Currency not supported");
    //         }
    //         let conversionRate = exchangeRates[currency];
    //         let convertedPaymentAmount = parseFloat(
    //             (payment_amount * conversionRate).toFixed(2)
    //         );

    //         let convertedMinBookingAmt = parseFloat(
    //             (minimum_booking_amount * conversionRate).toFixed(2)
    //         );
    //         let data = {
    //             minimum_booking_amount: convertedMinBookingAmt,
    //             convertedPaymentAmount: convertedPaymentAmount,
    //         };
    //         return data;
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    async check_surcharge_date(vehicle_id: string, lat, long) {
        try {
            const TIMEZONE = process.env.APP_TIMEZONE || "UTC";

            // const startOfDay = momentTz()
            //     .startOf("day")
            //     .subtract(5, "hour")
            //     .subtract(30, "minute")
            //     .valueOf();
            // const endOfDay = momentTz()
            //     .endOf("day")
            //     .subtract(5, "hour")
            //     .subtract(30, "minute")
            //     .valueOf();

            // const currentTime = momentTz()
            //     .add(5, "hour")
            //     .add(30, "minute")
            //     .format("HH:mm"); // Get the time part in 'HH:MM' format

            const startOfDay = momentTz().tz(TIMEZONE).startOf("day").valueOf();
            const endOfDay = momentTz().tz(TIMEZONE).endOf("day").valueOf();
            const currentTime = momentTz().tz(TIMEZONE).format("HH:mm");

            let driver_availabilty_surcharge;
            // Find a record with the current date
            const record = await this.model.surchargeDates.findOne({
                date: { $gte: startOfDay, $lte: endOfDay },
            });

            // if (!record) {                                                                 //commented to remove surcharge when driver is less in a city
            //     if (lat && long) {
            //         let driver_available_in_city =
            //             await this.findDriversInSameCity(lat, long, vehicle_id);
            //         driver_availabilty_surcharge =
            //             await this.model.surchargeDates.findOne({
            //                 vehicle_id: vehicle_id,
            //                 no_of_driver: { $gte: driver_available_in_city },
            //             });
            //         let check_history;
            //         if (driver_availabilty_surcharge) {
            //             check_history =
            //                 await this.model.surchargeHistory.findOne({
            //                     vehicle_id: vehicle_id,
            //                     end_time: null,
            //                 });
            //         }
            //         if (!check_history && driver_availabilty_surcharge) {
            //             await this.model.surchargeHistory.create({
            //                 vehicle_id: vehicle_id,
            //                 start_time: moment().valueOf(),
            //             });
            //         }
            //         if (!driver_availabilty_surcharge) {
            //             await this.model.surchargeHistory.updateOne(
            //                 { vehicle_id: vehicle_id },
            //                 { end_time: moment().valueOf() }
            //             );
            //         }
            //     }
            // }

            if (record || driver_availabilty_surcharge) {
                // Extract start_time and end_time from the record
                if (record) {
                    const { start_time, end_time } = record;

                    // Check if current time is between start_time and end_time
                    if (currentTime >= start_time && currentTime <= end_time) {
                        const surcharge_amount =
                            await this.model.vehicle.findOne({
                                vehicle_id: vehicle_id,
                                is_active: true,
                            });
                        return surcharge_amount.surcharge_price;
                    }
                }
                // else {                                                                 //commented to remove surcharge when driver is less in a city
                //     const surcharge_amount = await this.model.vehicle.findOne({
                //         vehicle_id: vehicle_id,
                //         is_active: true,
                //     });
                //     return surcharge_amount.surcharge_price;
                // }
            }
            return null;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async AdminBookingListing(body) {
        try {
            let query : any = {};
            if (body.status === BookingStatus.Accept) {
                query = { booking_status: BookingStatus.Accept };
            } else if (body.status === BookingStatus.Completed) {
                query = { booking_status: BookingStatus.Completed };
            } else if (body.status === BookingStatus.Failed) {
                query = { booking_status: BookingStatus.Failed };
            } else if (body.status === BookingStatus.Cancelled) {
                query = { booking_status: BookingStatus.Cancelled };
            } else if (body.status === "scheduled") {
                query = { booking_type: BookingType.Schedule };
            }

            if (body.search) {
                const regex = new RegExp(body.search, "i");
                query.booking_id = regex;
            }

            const page = parseInt(body.page) || 1;
            const limit = parseInt(body.limit) || 10;
            const skip = (page - 1) * limit;
            const data = await this.model.booking
                .find(query, {
                    booking_id: 1,
                    customer_id: 1,
                    driver_id: 1,
                    pickup_address: 1,
                    total_amount: 1,
                    created_at: 1,
                    request_type: 1,
                    booking_type: 1,
                    schedule_date: 1
                })
                .skip(skip)
                .limit(limit)
                .sort({ created_at: -1 })
                .populate("customer_id", "name email")
                .populate("driver_id", "name email")
                .populate("company_id", "name");

            const data_count = await this.model.booking.countDocuments(query, {
                booking_id: 1,
                customer_id: 1,
                driver_id: 1,
                pickup_address: 1,
                total_amount: 1,
                created_at: 1,
            });

            const active_count = await this.model.booking.countDocuments({
                booking_status: BookingStatus.Accept,
            });
            const failed_count = await this.model.booking.countDocuments({
                booking_status: BookingStatus.Failed,
            });

            const cancelled_count = await this.model.booking.countDocuments({
                booking_status: BookingStatus.Cancelled,
            });

            const completed_count = await this.model.booking.countDocuments({
                booking_status: BookingStatus.Completed,
            });

            const schedule_count = await this.model.booking.countDocuments({
                booking_type: BookingType.Schedule,
            });

            // if (body.search) {
            //     const regex = new RegExp(body.search, "i");
            //     return {
            //         data: data.filter((booking) =>
            //             regex.test(booking.booking_id)
            //         ),
            //     };
            // }
            return {
                active_count: active_count,
                completed_count: completed_count,
                cancelled_count: cancelled_count,
                failed_count: failed_count,
                schedule_count: schedule_count,
                count: data_count,
                data: data,
            };
        } catch (error) {
            console.error("error", error);
            throw error;
        }
    }

    async AdminBookingDetail(id) {
        try {
            let data_to_aggregate: any = [
                await this.bookingAggregation.match(id),
                await this.bookingAggregation.bookingReviewLookup(),
                await this.bookingAggregation.customerNameLookup(),
                await this.bookingAggregation.customer_unwind(),
                await this.bookingAggregation.companyNameLookup(),
                await this.bookingAggregation.Company_unwind(),
                await this.bookingAggregation.dispatcherNameLookup(),
                await this.bookingAggregation.dispatcher_unwind(),
                await this.bookingAggregation.AssignedNameLookup(),
                await this.bookingAggregation.Assigned_unwind(),
                await this.bookingAggregation.driverNameLookup(),
                await this.bookingAggregation.driver_unwind(),
                await this.bookingAggregation.vehicleNameLookup(),
                await this.bookingAggregation.vehicle_unwind(),
                await this.bookingAggregation.vehicleTypeLookup(),
                await this.bookingAggregation.CouponDetailLookup(),
            ];
            const data = await this.model.booking.aggregate(data_to_aggregate);
            return { data: data[0] };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async check_stop_time(reached_at, departure_at, booking_data) {
        try {
            // Calculate the time difference in milliseconds
            const timeDifference = departure_at - reached_at;

            // Convert the time difference to minutes and seconds
            const minutes = Math.floor(timeDifference / 60000);
            const seconds = Math.floor((timeDifference % 60000) / 1000);

            console.log(
                `Time difference: ${minutes} minutes and ${seconds} seconds`
            );

            if (minutes >= 3) {
                const prices: any = await this.model.vehicle.findOne({
                    vehicle_id: new mongoose.Types.ObjectId(
                        booking_data.vehicle_id
                    ),
                    is_active: true,
                });

                // Calculate additional minutes beyond the threshold (3 minutes)
                const additionalMinutes = minutes - 3;
                const additionalSeconds = seconds;

                // Calculate total additional chargeable minutes
                const totalMinutes =
                    additionalMinutes + (additionalSeconds > 0 ? 1 : 0);

                let totalAdditionalMinutes =
                    totalMinutes - booking_data.last_stop_charges_mins;

                // Calculate the additional stop charges
                const additionalStopCharges =
                    totalAdditionalMinutes * prices.stop_charges;
                const stop_charges =
                    booking_data.stop_charges + additionalStopCharges;
                const total_amount =
                    booking_data.total_amount + additionalStopCharges;
                await this.model.booking.updateOne(
                    { _id: booking_data._id },
                    {
                        stop_charges: stop_charges,
                        total_amount: total_amount,
                        last_stop_charges_mins: totalAdditionalMinutes,
                    }
                );
            }
        } catch (error) {
            throw error;
        }
    }

    async recived_payment(booking_id, driver_id) {
        try {
            await this.model.booking.findOneAndUpdate(
                { _id: booking_id },
                { payment_received: true }
            );

            let current_time = moment().valueOf();
            let schedule_booking = await this.model.booking.findOne({
                driver_id: driver_id,
                booking_type: BookingType.Schedule,
                schedule_date: {
                    $lt: moment(current_time).add(15, "minutes").valueOf(),
                },
            });
            // if (!schedule_booking) {
            await this.model.drivers.updateOne(
                { _id: driver_id },
                { current_booking: null, ride_status: "free" }
            );
            // }

            // create booking Activity

            /*this.activityService.logActivity({ 
               booking_id: booking_id.toString(), 
               userId: driver_id, 
               action: "BOOKING_PAYMENT", 
               resource: "booking", 
               description: "Successfully confirmed payment", 
               payload: { booking_type: BookingType.Schedule,driver_id: driver_id}
           });*/

            // end 

            return { message: "succesfully confirmed payment" };
        } catch (error) {
            console.error("error", error);
            throw error;
        }
    }

    async updateBookingInfo(body, customer_id) {
        try {
            let tip_amount = body.tip;
            const booking_data = await this.find_booking_with_id(body.id);
            const customer = await this.model.customers.findOne({
                _id: customer_id,
            });
            // Initialize data_to_update with existing data
            const data_to_update: any = {};

            // Update tip and total amount if tip is provided
            if (body.tip !== undefined) {
                // if (customer.preferred_currency === "INR") {
                //     tip_amount = await this.convert_payment_amount(
                //         customer.preferred_currency,
                //         body.tip
                //     );
                // } else {
                //     tip_amount = body.tip;
                // }
                console.log("updated_success", tip_amount);
                data_to_update.total_amount = (
                    booking_data.total_amount -
                    booking_data.tip_driver +
                    tip_amount
                ).toFixed(2);
                data_to_update.tip_driver = tip_amount;
            }

            // Update payment method if provided
            if (body.payment_type) {
                data_to_update.payment_method = body.payment_type;
            }

            // Only perform the update if there are changes to be made
            if (Object.keys(data_to_update).length > 0) {
                await this.model.booking.updateOne(
                    { _id: new mongoose.Types.ObjectId(body.id) },
                    data_to_update
                );
            }
            return { message: "Updated successfully" };
        } catch (error) {
            console.error("Update failed:", error);
            throw error;
        }
    }

    async CheckScheduleBooking(customer_id) {
        try {
            const currentTime = +new Date();
            const oneHourLater = moment().add(1, 'hour').valueOf();

            const schedule_booking = await this.model.booking.findOne({
                customer_id: customer_id,
                booking_status: { $nin: [BookingStatus.Cancelled, BookingStatus.Failed, BookingStatus.Completed] },
                payment_success: true,
                // booking_type: { $in: ["schedule"]},
                $and: [
                    { schedule_date: { $ne: null } }, // Check if schedule_date is not null
                    { schedule_date: { $gt: currentTime } } // Check if schedule_date is greater than currentTime
                ]
            });
            console.log(schedule_booking, '<----schedule_booking');

            if (schedule_booking) {
                const scheduleDate = +new Date(schedule_booking.schedule_date);
                console.log(scheduleDate, '<----scheduleDate');
                console.log(oneHourLater, '<----oneHourLater');

                if (scheduleDate <= oneHourLater) {
                    console.log({ can_request: false }, '<------{ can_request: false }');

                    return { can_request: false }; // Less than or equal to 1 hour remaining
                }
            }
            console.log({ can_request: true }, '<------{ can_request: true }');

            return { can_request: true }; // No schedule booking within the next hour
        } catch (error) {
            throw error;
        }
    }

    async check_pickup_to_start_ride_time(start_ride_at, booking) {
        try {
            // Calculate the time difference in milliseconds
            const timeDifference =
                start_ride_at - booking.arrived_pickup_loc_at;
            // Convert the time difference to minutes and seconds
            const minutes = Math.floor(timeDifference / 60000);
            const seconds = Math.floor((timeDifference % 60000) / 1000);

            console.log(
                `Time difference: ${minutes} minutes and ${seconds} seconds`
            );

            if (minutes >= 5) {
                const prices: any = await this.model.vehicle.findOne({
                    vehicle_id: new mongoose.Types.ObjectId(booking.vehicle_id),
                    is_active: true,
                });

                // Calculate additional minutes beyond the threshold (3 minutes)
                const additionalMinutes = minutes - 5;
                const additionalSeconds = seconds;

                // Calculate total additional chargeable minutes
                const totalAdditionalMinutes =
                    additionalMinutes + (additionalSeconds > 0 ? 1 : 0);

                // Calculate the additional stop charges

                const additionalLateStartRideCharges =
                    totalAdditionalMinutes * prices.stop_charges;
                if (booking.stop_charges != additionalLateStartRideCharges) {
                    const total_amount =
                        booking.total_amount -
                        booking.stop_charges +
                        additionalLateStartRideCharges;

                    await this.model.booking.updateOne(
                        { _id: booking._id },
                        {
                            stop_charges: additionalLateStartRideCharges,
                            total_amount: total_amount,
                        }
                    );
                }
            }
        } catch (error) {
            console.log("error");
        }
    }

    async current_ride_request_socket(user_id) {
        try {
            const driver = await this.model.drivers.findOne({ _id: user_id });

            // let booking_data = await this.find_booking_with_id(
            //     driver.currently_send_ride_request_id,
            // );

            const booking = await this.model.booking.findOne({
                _id: driver?.currently_send_ride_request_id,
                cancelled_driver_ids: { $nin: [driver?._id] },
                booking_status: { $nin: [BookingStatus.Completed, BookingStatus.Ongoing, BookingStatus.Failed, BookingStatus.Cancelled] }
            }).populate([
                { path: "customer_id" },
                { path: "driver_id" },
                { path: "vehicle_id" },
                { path: "vehicleDetail_id" },
                { path: "company_id", select: "name email country_code phone_no created_at" },
            ]);

            let data = {
                driver,
                booking: booking ?? null
            };

            return data;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async socket_booking_accepted(booking_id: string) {
        const booking_details = await this.model.booking.findById(new Types.ObjectId(booking_id))

        const drivers = await this.model.drivers.find({ currently_send_ride_request_id: new Types.ObjectId(booking_id) }, { socket_id: 1 })
        console.log('drivers.length', drivers.length)
        // const socketIds = await this.model.drivers.distinct('socket_id', { currently_send_ride_request_id: new Types.ObjectId(booking_id) })
        const socketIds = drivers.map((res) => res.socket_id)
        return { socketIds, booking_details }
    }

    async cancel_request(id, payload) {
        try {
            const check_current_request: any = await this.model.drivers.findOne(
                {
                    currently_send_ride_request_id: id,
                }
            );
            const customer: any = await this.model.customers.findOne({
                _id: payload.user_id,
            });
            const booking = await this.model.booking.findOneAndUpdate(
                { _id: id },
                {
                    cancelled_by: "customer",
                    booking_status: "cancelled",
                    booking_type: "cancelled",
                }
            );


            // create booking Activity

            this.activityService.logActivity({
                booking_id: id.toString(),
                userId: customer?._id,
                action: "BOOKING_CANCELLED",
                resource: "booking",
                description: "Booking Cancelled - by " + customer?.name,
                payload: {
                    booking_id: id.toString(),
                    cancelled_by: "customer",
                    booking_status: "cancelled",
                    booking_type: "cancelled",
                }
            });

            // end 

            try {
                let data = await this.socket_booking_accepted(String(booking._id))
                console.log(data, '<----from socket_booking_accepted');

                const { socketIds, booking_details }: any = data
                socketIds.forEach((socketId) => {
                    this.server.to(socketId).emit("socket_booking_accepted", { booking: booking_details });
                });
            } catch (error) {
                console.log("socket failed from cancel_request ===> ", error);
            }
            await this.model.drivers.updateMany(
                { currently_send_ride_request_id: new Types.ObjectId(id) },
                {
                    currently_send_ride_request: false,
                    currently_send_ride_request_id: null,
                    currently_send_ride_request_generate_at: null,
                    ride_status: ride_status.free,
                    current_booking: null,
                }
            );
            const check_driver_accept_the_req =
                await this.model.booking.findOne({
                    _id: id,
                });
            const scope = (!booking.booking_status && !booking.ride_status) ? { scope: "failed" } : { scope: payload.scope }
            if (check_driver_accept_the_req.payment_method != 'invoice') {
                this.cancelRefund(check_driver_accept_the_req, scope);
            }
            if (check_driver_accept_the_req.driver_id) {
                await this.model.drivers.updateOne(
                    { _id: check_driver_accept_the_req.driver_id },
                    {
                        ride_status: ride_status.free,
                        current_booking: null,
                        currently_send_ride_request: false,
                        currently_send_ride_request_id: null,
                    }
                );
                let key_2 = "cancel_request_description";
                let key_1 = "cancel_request_title";
                const ride_cancel_title = await this.commonService.localization(
                    check_current_request?.preferred_language ?? "english",
                    key_1
                );
                const ride_cancel_description =
                    await this.commonService.localization(
                        check_current_request?.preferred_language ?? "english",
                        key_2
                    );
                const fcm_token = await this.model.sessions.find({
                    user_id: check_current_request?._id,
                });
                for (const fcmTokens of fcm_token) {
                    const notifyPayload = {
                        title: ride_cancel_title[
                            check_current_request.preferred_language
                        ],
                        message:
                            ride_cancel_description[
                            check_current_request.preferred_language
                            ],
                    };
                    let data_push = {
                        type: "cancel_request",
                        booking: check_driver_accept_the_req,
                    };
                    try {
                        await this.notification.send_notification(
                            notifyPayload,
                            fcmTokens.fcm_token,
                            data_push
                        );
                    } catch (error) {
                        console.log(error, "notificaiton fail---->");

                    }

                }
            }
            let key_1 = "cancelled_booking";
            const cancel_booking_msg = await this.commonService.localization(
                customer.preferred_language,
                key_1
            );
            return {
                message: cancel_booking_msg[customer.preferred_language],
            };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async cancelRefund(booking_data, scope) {
        try {
            console.log("in cancel refund.....");

            let configuration: any = await this.model.appConfiguration.findOne();

            let vehicle_prices: any = await this.model.vehicle.findOne({
                vehicle_id: booking_data.vehicle_id,
            });
            console.log("booking_data......................in cancel refund", booking_data.driver_id);
            console.log("scope-------->", scope);

            if (scope.scope === "customer") {
                if (booking_data.driver_id) {

                    console.log("driber found customer cancel.....");
                    console.log(booking_data, '<-----booking_data');
                    console.log(configuration, '<-----configuration');
                    const total_amount = (booking_data.pending_booking_amount) ? booking_data.total_trip_amount - booking_data?.pending_booking_amount : booking_data.total_trip_amount

                    let refund_amount =
                        total_amount -
                        configuration.cancellation_charges;
                    console.log(refund_amount, '<----refund_amount');

                    let cents_amount = +(refund_amount * 100).toFixed(2);
                    let gst_amount =
                        configuration.cancellation_charges *
                        (configuration.tax.tax_percentage / 100);
                    let total_amount_without_tax =
                        configuration.cancellation_charges - gst_amount;
                    const admin_comission_amount =
                        (total_amount_without_tax *
                            vehicle_prices.commission_percentage) /
                        100;
                    const payout_amount =
                        total_amount_without_tax - admin_comission_amount;
                    console.log(cents_amount, '<--------parseFloat((cents_amount).toFixed(2))');

                    const refund = await this.stripe.refunds.create({
                        payment_intent: booking_data.intent_id,
                        amount: cents_amount,
                    });

                    console.log("refund................", refund);

                    await this.model.booking.updateOne(
                        { _id: booking_data._id },
                        {
                            payment_status: "refund",
                            refund_amount: refund_amount,
                            refund_initiate: moment().valueOf(),
                        }
                    );

                    await this.model.drivers.updateOne(
                        { _id: booking_data.driver_id },
                        { ride_status: ride_status.free }
                    );

                    await this.model.payments.updateOne(
                        { booking_id: booking_data._id },
                        {
                            amount: configuration.cancellation_charges,
                            commision_amount: admin_comission_amount.toFixed(2),
                            payout_amount: payout_amount.toFixed(2),
                            is_refund: true,
                        }
                    );
                    await this.model.driverEarnings.updateOne(
                        { booking_id: booking_data._id },
                        {
                            booking_amount: configuration.cancellation_chargest,
                            admin_comission_amount: admin_comission_amount,
                            amount: payout_amount,
                        }
                    );
                } else {

                    await this.model.booking.updateOne(
                        { _id: booking_data._id },
                        {
                            payment_status: "refund",
                            refund_amount: booking_data.total_trip_amount,
                            refund_initiate: moment().valueOf(),
                        }
                    );

                    const refund = await this.stripe.refunds.create({
                        payment_intent: booking_data.intent_id,
                    });

                    console.log("customer cancel refund..........", refund);

                }
            } else if (scope.scope === "failed") {
                console.log("driber found customer cancel.....");
                console.log(booking_data, '<-----booking_data');
                console.log(configuration, '<-----configuration');

                let refund_amount = (booking_data.pending_booking_amount) ? booking_data.total_trip_amount - booking_data?.pending_booking_amount : booking_data.total_trip_amount

                // booking_data.total_amount
                console.log(refund_amount, '<----refund_amount');

                let cents_amount = +(refund_amount * 100).toFixed(2);

                console.log(cents_amount, '<--------parseFloat((cents_amount).toFixed(2))');
                Logger.log({ payment_intent: booking_data.intent_id });

                const refund = await this.stripe.refunds.create({
                    payment_intent: booking_data.intent_id,
                    amount: cents_amount,
                });

                console.log("refund................", refund);

                await this.model.booking.updateOne(
                    { _id: booking_data._id },
                    {
                        payment_status: "refund",
                        refund_amount: refund_amount,
                        refund_initiate: moment().valueOf(),
                    }
                );

                await this.model.drivers.updateOne(
                    { _id: booking_data.driver_id },
                    { ride_status: ride_status.free }
                );

                await this.model.payments.updateOne(
                    { booking_id: booking_data._id },
                    {
                        // amount: configuration.cancellation_charges,
                        is_refund: true,
                    }
                );
            }
        } catch (error) {
            throw error;
        }
    }
    async WaitingChargeCron() {
        try {
            let app_configuration: any = await this.model.appConfiguration.findOne();
            const sent_noti_bookings = await this.model.booking.find({
                ride_status: "reached_at_pickup",
                booking_status: "accepted",
            });
            const sent_noti_stop1_bookings = await this.model.booking.find({
                ride_status: "reached_at_stop_1",
            });
            const sent_noti_stop2_bookings = await this.model.booking.find({
                ride_status: "reached_at_stop_2",
            });

            let key_1 = "waititng_charge_driver_title";
            let key_2 = "waititng_charge_driver_description";
            let driver_translate_title = await this.commonService.localization(
                "driver.preferred_language",
                key_1
            );
            let driver_translate_description =
                await this.commonService.localization(
                    "driver.preferred_language",
                    key_2
                );
            let customer_key_1 = "waititng_charge_customer_title";
            let customer_key_2 = "waititng_charge_customer_description";
            let customer_translate_title =
                await this.commonService.localization(
                    "customer.preferred_language",
                    customer_key_1
                );
            let customer_translate_description =
                await this.commonService.localization(
                    "customer.preferred_language",
                    customer_key_2
                );
            await this.startRideAfter5minCharge(
                sent_noti_bookings,
                app_configuration,
                driver_translate_title,
                driver_translate_description,
                customer_translate_title,
                customer_translate_description
            );
            await this.stop1After3minCharge(
                sent_noti_stop1_bookings,
                app_configuration,
                driver_translate_title,
                driver_translate_description,
                customer_translate_title,
                customer_translate_description
            );

            await this.stop2After3minCharge(
                sent_noti_stop2_bookings,
                app_configuration,
                driver_translate_title,
                driver_translate_description,
                customer_translate_title,
                customer_translate_description
            );
        } catch (error) {
            throw error;
        }
    }

    async socketWaitingChargeNoti(booking_id) {
        try {
            const app_configuration: any = await this.model.appConfiguration.findOne();
            const booking = await this.model.booking.findOne({
                _id: booking_id,
            });
            const customer = await this.model.customers.findOne({
                _id: booking.customer_id,
            });
            const driver = await this.model.drivers.findOne({
                _id: booking.driver_id,
            });

            let key_1 = "waititng_charge_driver_title";
            let key_2 = "waititng_charge_driver_description";
            let driver_translate_title = await this.commonService.localization(
                driver.preferred_language,
                key_1
            );
            let driver_translate_description =
                await this.commonService.localization(
                    driver.preferred_language,
                    key_2
                );
            let customer_key_1 = "waititng_charge_customer_title";
            let customer_key_2 = "waititng_charge_customer_description";
            let customer_translate_title =
                await this.commonService.localization(
                    customer.preferred_language,
                    customer_key_1
                );
            let customer_translate_description =
                await this.commonService.localization(
                    customer.preferred_language,
                    customer_key_2
                );
            let type;
            let time;
            let query = {};

            if (booking.ride_status === "reached_at_pickup") {
                type = booking.is_waiting_charge_noti_send;
                time = booking.arrived_pickup_loc_at
                if (booking.schedule_date) {
                    if (booking.schedule_date > booking.arrived_pickup_loc_at) {
                        time = booking.schedule_date;
                    } else {
                        time = booking.arrived_pickup_loc_at;
                    }
                } else {
                    time = booking.arrived_pickup_loc_at;
                }
                query = { is_waiting_charge_noti_send: true };
            } else if (booking.ride_status === "reached_at_stop_1") {
                type = booking.is_stop1_charge_noti_send;
                time = booking.arrived_at_stop_1;
                query = { is_stop1_charge_noti_send: true };
            } else if (booking.ride_status === "reached_at_stop_2") {
                type = booking.is_stop2_charge_noti_send;
                time = booking.arrived_at_stop_2;
                query = { is_stop2_charge_noti_send: true };
            }
            if (type === false) {
                const customer_fcm_token = await this.model.sessions.findOne({
                    user_id: booking.customer_id,
                });
                const driver_fcm_token = await this.model.sessions.findOne({
                    user_id: booking.driver_id,
                });
                await this.model.booking.updateOne({ _id: booking._id }, query);
                let push_data_for_driver = {
                    title: driver_translate_title[driver.preferred_language],
                    message:
                        driver_translate_description[driver.preferred_language],
                };

                let push_data_for_customer = {
                    title: customer_translate_title[
                        customer.preferred_language
                    ],
                    message:
                        customer_translate_description[
                        customer.preferred_language
                        ],
                };
                let data = {
                    type: "waiting_charge",
                };
                this.notification.send_notification(
                    push_data_for_driver,
                    driver_fcm_token.fcm_token,
                    data
                );
                this.notification.send_notification(
                    push_data_for_customer,
                    customer_fcm_token.fcm_token,
                    data
                );
            }
            const booking_data = await this.model.booking
                .findOne({ _id: booking_id })
                .populate([{ path: "customer_id" }, { path: "driver_id" }]);
            let data = {
                customer: customer.socket_id,
                driver: driver.socket_id,
                booking: booking_data,
            };
            return { data: data };
        } catch (error) {
            throw error;
        }
    }

    async CheckCoupon(coupon_id) {
        try {
            let result;
            let coupon_exist = await this.model.coupons.findOne({
                _id: coupon_id,
                status: "active",
            });
            if (coupon_exist) {
                result = true;
            } else {
                result = false;
            }
            return { data: result };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async findDriversInSameCity(
        pick_up_lat: string,
        pick_up_long: string,
        vehicle_id
    ) {
        try {
            // Step 1: Reverse Geocode the pickup location to get the city name
            const pickupCity = await this.commonService.reverseGeocode(
                pick_up_lat,
                pick_up_long
            );
            // Step 2: Find all active drivers
            const drivers = await this.model.drivers.find(
                {
                    vehicle_type_id: vehicle_id,
                    is_active: true,
                    is_block: false,
                    is_deleted: false,
                    ride_status: "free",
                    status: "online",
                },
                { latitude: 1, longitude: 1 }
            );
            const driversInSameCity = [];
            // Step 3: Loop through drivers and reverse geocode their lat-long
            for (const driver of drivers) {
                const driverCity = await this.commonService.reverseGeocode(
                    driver.latitude,
                    driver.longitude
                );

                if (driverCity === pickupCity) {
                    driversInSameCity.push(driver); // Save the driver if in the same city
                }
            }
            let no_of_drivers_available = driversInSameCity.length;
            return no_of_drivers_available;
        } catch (error) {
            console.error("Error finding drivers in the same city:", error);
            throw new HttpException(
                "Error finding drivers in the same city",
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async dispatcherBookingList(
        payload: DispatcherGetBookingsDto,
        dispatcher_id: string
    ) {
        try {
            const query = {
                dispatcher_id: new Types.ObjectId(dispatcher_id),
                ...(payload.status == DispatcherBookingStatus.upcoming && {
                    booking_status: {
                        $in: [
                            BookingStatus.Accept,
                            BookingStatus.Request,
                            null,
                        ],
                    },
                }),
                ...(payload.status == DispatcherBookingStatus.completed && {
                    booking_status: BookingStatus.Completed,
                }),
                ...(payload.status == DispatcherBookingStatus.ongoing && {
                    booking_status: BookingStatus.Ongoing,
                }),
            };

            const options = await this.commonService.set_options(
                payload?.pagination,
                payload?.limit
            );
            const data = await this.model.booking
                .find(
                    query,
                    {
                        booking_id: 1,
                        customer_id: 1,
                        driver_id: 1,
                        booking_status: 1,
                        pickup_address: 1,
                        drop_address: 1,
                        total_amount: 1,
                        created_at: 1,
                    },
                    options
                )
                .populate([
                    { path: "customer_id", select: "name" },
                    { path: "driver_id", select: "name" },
                ]);
            const count = await this.model.booking.countDocuments(query);
            return { data, count };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    private buildScheduledBookingQuery(payload: DispatcherGetBookingsDto, dispatcher_id: string): any {
        const query: any = {
            schedule_date: { $ne: null },
            // booking_type: BookingType.Schedule,
            // driver_id: { $ne: null },
        };

        switch (payload.status) {
            case DispatcherBookingStatus.upcoming:
                Object.assign(query, {
                    booking_status: {
                        $nin: [
                            BookingStatus.Cancelled,
                            BookingStatus.Failed,
                            BookingStatus.Ongoing,
                            BookingStatus.Completed,
                        ],
                    },
                    ride_status : {$in : ["reached_at_pickup" , null]},
                    driver_id : { $ne: null }
                });
                break;

            case DispatcherBookingStatus.completed:
                query.booking_status = BookingStatus.Completed;
                query.driver_id = { $ne: null }; // Ensure driver_id is not null
                break;

            case DispatcherBookingStatus.ongoing:
                Object.assign(query, {
                    booking_status: {
                        $in: [BookingStatus.Accept, BookingStatus.Ongoing],
                    },
                    ride_status : {$in : [
                        'start_ride',
                        'reached_at_stop_1',
                        'started_from_Stop_1',
                        'reached_at_stop_2',
                        'started_from_Stop_2'
                    ]},
                    driver_id: { $ne: null },
                });
                break;

            case 'cancelled':
                query.booking_status ={$in : [BookingStatus.Cancelled, BookingStatus.Failed]};
                break;
        }

        if (payload?.payment_status === 'unpaid') {
            Object.assign(query, {
                payment_method: 'invoice_unpaid',
                dispatcher_id: new Types.ObjectId(dispatcher_id),
            });
        }

        console.log('query', query)

        return query;
    }

    // async scheduledBookingList(payload: DispatcherGetBookingsDto, dispatcher_id: string) {
    //     try {
    //         const query = this.buildScheduledBookingQuery(payload, dispatcher_id);

    //         // Handle company_id if present
    //         if (payload?.company_id) {
    //             query.company_id = new mongoose.Types.ObjectId(payload.company_id);
    //         }

    //         const options = await this.commonService.set_options(payload?.pagination, payload?.limit);

    //         let data = await this.model.booking
    //             .find(
    //                 query,
    //                 {
    //                     booking_id: 1,
    //                     customer_id: 1,
    //                     driver_id: 1,
    //                     pickup_address: 1,
    //                     drop_address: 1,
    //                     total_amount: 1,
    //                     created_at: 1,
    //                     schedule_date: 1,
    //                     booking_status: 1,
    //                 },
    //                 options
    //             )
    //             .sort({ schedule_date: 1 })
    //             .populate([
    //                 { path: "customer_id", select: "name" },
    //                 { path: "driver_id", select: "name" },
    //             ]);

    //         let count = await this.model.booking.countDocuments(query);

    //         if (payload.search) {
    //             const regex = new RegExp(payload.search, 'i');
    //             data = data.filter((item: any) =>
    //                 (item.driver_id && regex.test(item.driver_id.name)) ||
    //                 (item.booking_id && regex.test(String(item.booking_id)))
    //             );
    //             count = data.length;
    //         }

    //         return { data, count };

    //     } catch (error) {
    //         console.error('scheduledBookingList error:', error);
    //         throw error;
    //     }
    // }

    async scheduledBookingList(payload: DispatcherGetBookingsDto, dispatcher_id: string) {
        try {
            const baseMatch: any = this.buildScheduledBookingQuery(payload, dispatcher_id);

            if (payload?.company_id) {
                baseMatch.company_id = new mongoose.Types.ObjectId(payload.company_id);
            }

            const options = await this.commonService.set_options(payload?.pagination, payload?.limit);

            const lookups = [
                {
                    $lookup: {
                        from: "customers", 
                        localField: "customer_id",
                        foreignField: "_id",
                        as: "customer_id",
                    },
                },
                { $unwind: { path: "$customer_id", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "drivers",
                        localField: "driver_id",
                        foreignField: "_id",
                        as: "driver_id",
                    },
                },
                { $unwind: { path: "$driver_id", preserveNullAndEmptyArrays: true } },
            ];

            // Add search only after lookups
            if (payload.search) {
                const regex = new RegExp(payload.search, "i");
                baseMatch.$or = [
                    { booking_id: { $regex: regex } },
                    { "driver_id.name": { $regex: regex } },
                    { "customer_id.name": { $regex: regex } },
                ];
            }

            const projection = {
                booking_id: 1,
                "customer_id._id": 1,
                "customer_id.name": 1,
                "driver_id._id": 1,
                "driver_id.name": 1,
                pickup_address: 1,
                drop_address: 1,
                total_amount: 1,
                created_at: 1,
                schedule_date: 1,
                booking_status: 1,
            };

            const pipeline = [
                ...lookups,
                { $match: baseMatch },
                { $project: projection },
                { $sort: { schedule_date: -1 } },
            ];

            // Paginated pipeline
            const paginatedPipeline : any = [
                ...pipeline,
                { $skip: options.skip ?? 0 },
                { $limit: options.limit ?? 10 },
            ];

            // Run queries
            const [data, countResult] = await Promise.all([
                this.model.booking.aggregate(paginatedPipeline),
                this.model.booking.aggregate([
                    ...lookups,
                    { $match: baseMatch },
                    { $count: "count" },
                ]),
            ]);

            const count = countResult[0]?.count ?? 0;

            return { data, count };
        } catch (error) {
            console.error("scheduledBookingList error:", error);
            throw error;
        }
    }

    async scheduledBookingList_old(
        payload: DispatcherGetBookingsDto,
        dispatcher_id
    ) {
        try {

            console.log("log.. scheduledBookingList", payload);

            let query: any = {
                schedule_date: { $ne: null },
                booking_type: BookingType.Schedule,
                driver_id: { $ne: null },
                ...(payload.status == DispatcherBookingStatus.upcoming && {
                    booking_status: {
                        $nin: [BookingStatus.Cancelled, BookingStatus.Failed, BookingStatus.Ongoing],
                    },
                    ride_status: null,
                }),
                ...(payload.status == DispatcherBookingStatus.completed && {
                    booking_status: BookingStatus.Completed,
                }),
                ...(payload.status == DispatcherBookingStatus.ongoing && {
                    booking_status: { $in: [BookingStatus.Accept, BookingStatus.Ongoing,] },
                    ride_status: {
                        $in: [
                            "start_ride"
                        ]
                    },
                    // schedule_date: { $gte: moment().valueOf() },
                }),
                // ...(payload.status == "assign_by_me" && {
                //     dispatcher_id: new mongoose.Types.ObjectId(dispatcher_id),
                // }),
                ...(payload.status == "cancelled" && {
                    booking_status: [BookingStatus.Cancelled, BookingStatus.Failed]
                }),
                ...(payload?.payment_status == 'unpaid' && {
                    payment_method: 'invoice_unpaid',
                    dispatcher_id: new Types.ObjectId(dispatcher_id)
                }),
            };

            if (payload?.company_id) {
                query = { company_id: new mongoose.Types.ObjectId(payload.company_id) }
            }

            const options = await this.commonService.set_options(
                payload?.pagination,
                payload?.limit
            );
            let data: any = await this.model.booking
                .find(
                    query,
                    {
                        booking_id: 1,
                        customer_id: 1,
                        driver_id: 1,
                        pickup_address: 1,
                        drop_address: 1,
                        total_amount: 1,
                        created_at: 1,
                        schedule_date: 1,
                        booking_status: 1,
                    },
                    options
                )
                .sort({ schedule_date: 1 })
                .populate([
                    { path: "customer_id", select: "name" },
                    { path: "driver_id", select: "name" },
                ]);
            let count = await this.model.booking.countDocuments(query);
            if (payload.search) {
                const regex = new RegExp(payload.search, 'i');  // Create a case-insensitive regex pattern
                data = data.filter(item =>
                    (item.driver_id && regex.test(item.driver_id.name)) ||
                    (item.booking_id && regex.test(String(item.booking_id)))  // Search booking_id as string
                );
                count = data.length;
            }

            return { data, count };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async dispatchBookingDrivers() {
        try {
            let dispatchbookingDriver = [];
            const currentTime: any = new Date();
            const dispatcher_bookings = await this.model.booking.find({
                booking_status: BookingStatus.Accept,
                schedule_date: { $ne: null },
                dispatcher_id: { $ne: null },
                booking_type: "schedule",
            });

            for (const booking of dispatcher_bookings) {
                const timeDifference: any = (
                    (booking.schedule_date - currentTime) /
                    1000 /
                    60
                ).toFixed(2); // difference in minutes

                console.log("differ", timeDifference);
                if (timeDifference <= 45) {
                    dispatchbookingDriver.push({
                        driver_id: booking.driver_id,
                    });
                }
            }
            // console.log("dispatchbookingDriver", dispatchbookingDriver);

            return dispatchbookingDriver;
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async startRideAfter5minCharge(
        sent_noti_bookings,
        app_configuration,
        driver_translate_title,
        driver_translate_description,
        customer_translate_title,
        customer_translate_description
    ) {
        try {
            const currentTime = moment().valueOf();
            for (const booking of sent_noti_bookings) {
                const startTime =
                    booking.schedule_date && booking.schedule_date > booking.arrived_pickup_loc_at
                        ? booking.schedule_date
                        : booking.arrived_pickup_loc_at;
                const tenMinutesAdd = moment(startTime).add(10, 'minute').valueOf();
                const timeDifference = moment(currentTime).diff(startTime, 'minute');
                console.log(timeDifference, '<----waiting charge apply condition');

                if (
                    timeDifference >= 10
                ) {
                    console.log('<---wait charges applying--->');
                    if (booking.is_waiting_charge_noti_send == false) {

                        let driver = await this.model.drivers.findOne({
                            _id: booking.driver_id,
                        });
                        let customer = await this.model.customers.findOne({
                            _id: booking.customer_id,
                        });
                        const customer_fcm_token =
                            await this.model.sessions.findOne({
                                user_id: booking.customer_id,
                            });
                        const driver_fcm_token = await this.model.sessions.findOne({
                            user_id: booking.driver_id,
                        });

                        await this.model.booking.updateOne(
                            { _id: booking._id },
                            { is_waiting_charge_noti_send: true }
                        );
                        let push_data_for_driver = {
                            title: driver_translate_title[
                                driver.preferred_language
                            ],
                            message:
                                driver_translate_description[
                                driver.preferred_language
                                ],
                        };

                        let push_data_for_customer = {
                            title: customer_translate_title[
                                customer.preferred_language
                            ],
                            message:
                                customer_translate_description[
                                customer.preferred_language
                                ],
                        };
                        let data = {
                            type: "waiting_charge",
                        };
                        this.notification.send_notification(
                            push_data_for_driver,
                            driver_fcm_token.fcm_token,
                            data
                        );
                        this.notification.send_notification(
                            push_data_for_customer,
                            customer_fcm_token.fcm_token,
                            data
                        );
                    }

                    const prices: any = await this.model.vehicle.findOne({
                        vehicle_id: new mongoose.Types.ObjectId(
                            booking.vehicle_id
                        ),
                        is_active: true,
                    });
                    let totalAdditionalMinutes = moment(currentTime).diff(tenMinutesAdd, "minute")

                    console.log(totalAdditionalMinutes, '<-----totalAdditionalMinutes');
                    console.log(totalAdditionalMinutes + 1, '<----lateMin');

                    console.log(prices.stop_charges, '<-----prices.stop_charges');

                    // Calculate the additional stop charges
                    const additionalLateStartFromStop = (totalAdditionalMinutes + 1) * prices.stop_charges;
                    console.log(additionalLateStartFromStop, '<----late charges');
                    console.log(app_configuration.tax.tax_percentage / 100, '<----tax percentage');

                    let add_tax = (additionalLateStartFromStop * (+app_configuration.tax.tax_percentage / 100));
                    console.log(add_tax, '<---add_tax');

                    const stop_charges = add_tax + additionalLateStartFromStop;
                    console.log(stop_charges, '<===stop_charges');

                    const booking_amount = booking?.total_trip_amount ?? booking?.total_amount
                    console.log(booking_amount, '<===booking_amount')
                    const addWaitChrges = booking_amount + stop_charges
                    console.log('late charge amount ===>', addWaitChrges);
                    const driver_earning = booking?.total_trip_amount - booking?.app_earning

                    let total_tax = Number(Number(booking.gst) + Number(add_tax)).toFixed(2);
                    await this.model.booking.updateOne(
                        { _id: booking._id },
                        {
                            stop_charges: stop_charges,
                            total_amount: addWaitChrges,
                            amount_for_driver: driver_earning + stop_charges,
                            last_start_ride_charges_mins: totalAdditionalMinutes,
                            gst: total_tax,
                        }
                    );
                    const response: any = await this.socketWaitingChargeNoti(String(booking?._id))
                    this.server.to(response.data.driver).to(response.data.customer).emit('waiting_charge_noti', response.data.booking);
                }

            }
        } catch (error) {
            throw error;
        }
    }

    async stop1After3minCharge(
        sent_noti_stop1_bookings,
        app_configuration,
        driver_translate_title,
        driver_translate_description,
        customer_translate_title,
        customer_translate_description
    ) {
        try {
            for (const booking of sent_noti_stop1_bookings) {
                const FiveMinutesAdd =
                    booking.arrived_at_stop_1 + 5 * 60 * 1000;
                if (
                    moment().valueOf() >= FiveMinutesAdd &&
                    booking.is_stop1_charge_noti_send === false
                ) {
                    let driver = await this.model.drivers.findOne({
                        _id: booking.driver_id,
                    });
                    let customer = await this.model.customers.findOne({
                        _id: booking.customer_id,
                    });
                    const customer_fcm_token =
                        await this.model.sessions.findOne({
                            user_id: booking.customer_id,
                        });
                    const driver_fcm_token = await this.model.sessions.findOne({
                        user_id: booking.driver_id,
                    });
                    await this.model.booking.updateOne(
                        { _id: booking._id },
                        { is_stop1_charge_noti_send: true }
                    );
                    let push_data_for_driver = {
                        title: driver_translate_title[
                            driver.preferred_language
                        ],
                        message:
                            driver_translate_description[
                            driver.preferred_language
                            ],
                    };

                    let push_data_for_customer = {
                        title: customer_translate_title[
                            customer.preferred_language
                        ],
                        message:
                            customer_translate_description[
                            customer.preferred_language
                            ],
                    };
                    let data = {
                        type: "waiting_charge",
                    };
                    this.notification.send_notification(
                        push_data_for_driver,
                        driver_fcm_token.fcm_token,
                        data
                    );
                    this.notification.send_notification(
                        push_data_for_customer,
                        customer_fcm_token.fcm_token,
                        data
                    );
                }
                const timeDifference =
                    moment.now().valueOf() - booking.arrived_at_stop_1;

                // Convert the time difference to minutes and seconds
                const minutes = Math.floor(timeDifference / 60000);
                const seconds = Math.floor((timeDifference % 60000) / 1000) + 1;

                if (minutes >= 5) {
                    const prices: any = await this.model.vehicle.findOne({
                        vehicle_id: new mongoose.Types.ObjectId(
                            booking.vehicle_id
                        ),
                        is_active: true,
                    });

                    // Calculate additional minutes beyond the threshold (3 minutes)
                    const additionalMinutes = minutes - 5;
                    const additionalSeconds = seconds;

                    const totalMinutes =
                        additionalMinutes + (additionalSeconds > 0 ? 1 : 0);

                    let totalAdditionalMinutes =
                        totalMinutes - booking.last_stop_charges_mins;

                    // Calculate the additional stop charges
                    const additionalLateStartFromStop =
                        totalAdditionalMinutes * prices.stop_charges;

                    const stop_charges =
                        booking.stop_charges + additionalLateStartFromStop;
                    let add_tax =
                        (additionalLateStartFromStop *
                            app_configuration.tax.tax_percentage) /
                        100;
                    let total_tax = Number(
                        Number(booking.gst) + Number(add_tax)
                    ).toFixed(2);

                    const total_amount = Number(
                        (
                            Number(booking.total_amount) +
                            Number(additionalLateStartFromStop) +
                            Number(add_tax)
                        ).toFixed(2)
                    );

                    await this.model.booking.updateOne(
                        { _id: booking._id },
                        {
                            stop_charges: stop_charges,
                            total_amount: total_amount,
                            last_stop_charges_mins: totalMinutes,
                            gst: total_tax,
                        }
                    );
                }
            }
        } catch (error) {
            throw error;
        }
    }

    async stop2After3minCharge(
        sent_noti_stop2_bookings,
        app_configuration,
        driver_translate_title,
        driver_translate_description,
        customer_translate_title,
        customer_translate_description
    ) {
        try {
            for (const booking of sent_noti_stop2_bookings) {
                const fiveMinutesAdd =
                    booking.arrived_at_stop_2 + 5 * 60 * 1000;
                if (
                    moment().valueOf() >= fiveMinutesAdd &&
                    booking.is_stop2_charge_noti_send === false
                ) {
                    let driver = await this.model.drivers.findOne({
                        _id: booking.driver_id,
                    });
                    let customer = await this.model.customers.findOne({
                        _id: booking.customer_id,
                    });
                    const customer_fcm_token =
                        await this.model.sessions.findOne({
                            user_id: booking.customer_id,
                        });
                    const driver_fcm_token = await this.model.sessions.findOne({
                        user_id: booking.driver_id,
                    });
                    await this.model.booking.updateOne(
                        { _id: booking._id },
                        { is_stop2_charge_noti_send: true }
                    );
                    let push_data_for_driver = {
                        title: driver_translate_title[
                            driver.preferred_language
                        ],
                        message:
                            driver_translate_description[
                            driver.preferred_language
                            ],
                    };

                    let push_data_for_customer = {
                        title: customer_translate_title[
                            customer.preferred_language
                        ],
                        message:
                            customer_translate_description[
                            customer.preferred_language
                            ],
                    };
                    let data = {
                        type: "waiting_charge",
                    };
                    this.notification.send_notification(
                        push_data_for_driver,
                        driver_fcm_token.fcm_token,
                        data
                    );
                    this.notification.send_notification(
                        push_data_for_customer,
                        customer_fcm_token.fcm_token,
                        data
                    );
                }
                const timeDifference =
                    moment.now().valueOf() - booking.arrived_at_stop_2;
                // Convert the time difference to minutes and seconds
                const minutes = Math.floor(timeDifference / 60000);
                const seconds = Math.floor((timeDifference % 60000) / 1000) + 1;
                if (minutes >= 5) {
                    const prices: any = await this.model.vehicle.findOne({
                        vehicle_id: new mongoose.Types.ObjectId(
                            booking.vehicle_id
                        ),
                        is_active: true,
                    });

                    // Calculate additional minutes beyond the threshold (3 minutes)
                    const additionalMinutes = minutes - 5;
                    const additionalSeconds = seconds;

                    const totalMinutes =
                        additionalMinutes + (additionalSeconds > 0 ? 1 : 0);

                    let totalAdditionalMinutes =
                        totalMinutes - booking.last_stop2_charges_mins;
                    // Calculate the additional stop charges
                    const additionalLateStartFromStop =
                        totalAdditionalMinutes * prices.stop_charges;
                    const stop_charges =
                        booking.stop_charges + additionalLateStartFromStop;
                    let add_tax =
                        (additionalLateStartFromStop *
                            app_configuration.tax.tax_percentage) /
                        100;
                    let total_tax = Number(
                        Number(booking.gst) + Number(add_tax)
                    ).toFixed(2);
                    // const total_amount =
                    //     booking.total_amount +
                    //     additionalLateStartFromStop +
                    //     add_tax;

                    const total_amount = Number(
                        (
                            Number(booking.total_amount) +
                            Number(additionalLateStartFromStop) +
                            Number(add_tax)
                        ).toFixed(2)
                    );
                    await this.model.booking.updateOne(
                        { _id: booking._id },
                        {
                            stop_charges: stop_charges,
                            total_amount: total_amount,
                            last_stop2_charges_mins: totalMinutes,
                            gst: total_tax,
                        }
                    );
                }
            }
        } catch (error) {
            throw error;
        }
    }

    async broadCastRequest(id, payload) {
        try {
            console.log("INNNNNNNNNNNNNNNNNNNNNNNNNNN BROADCASE++++++++++++++++++++++++++++++++++=")
            // const booking: any = await this.model.booking
            //     .findOne({ _id: id })
            //     .populate([
            //         { path: "customer_id", select: 'connection_id socket_id current_booking email country_code phone name image' },
            //         { path: "driver_id", select: 'vehicle_type_id socket_id connection_id currently_send_ride_request_generate_at ride_status status socket_id connection_id currently_send_ride_request longitude latitude email country_code phone name image' },
            //         { path: "vehicle_id" },
            //         { path: "vehicleDetail_id" },
            //         { path: "company_id" },
            //     ]);

            const booking: any = await this.model.booking
                .findOne({ _id: id })
                .populate([
                    {
                        path: "customer_id",
                        select: 'connection_id socket_id current_booking name image',
                    },
                    {
                        path: "driver_id",
                        select: 'vehicle_type_id socket_id connection_id currently_send_ride_request_generate_at ride_status status socket_id connection_id currently_send_ride_request longitude latitude email country_code phone name image',
                    },
                    {
                        path: "company_id",
                        select: 'name email',
                    },
                    {
                        path: "vehicle_id",
                        select: 'vehicle_type image',
                    },
                    {
                        path: "vehicleDetail_id",
                        select: 'vehicle_photo driver_id vehicle_id name model number color',
                    },
                ])
                .select([
                    '_id',
                    'pickup_lat',
                    'pickup_long',
                    'company_id',
                    'dispatcher_id',
                    'driver_id',
                    'booking_id',
                    'request_type',
                    'sender_name',
                    'sender_country_code',
                    'sender_number',
                    'receiver_name',
                    'receiver_country_code',
                    'receiver_number',
                    'vehicle_id',
                    'pickup_address',
                    'drop_address',
                    'base_fee_without_addon',
                    'schedule_date',
                    'booking_status',
                    'booking_type',
                    'ride_status',
                    'is_ride_started',
                    'cancelled_by',
                    'payment_method',
                    'payment_status',
                    'distance_in_km',
                    'base_fee',
                    'base_fee_with_discount',
                    'stop_charges',
                    'surcharge_amount',
                    'toll_price',
                    'tip_driver',
                    'gst',
                    'coupon_discount',
                    'total_amount',
                    'total_trip_amount',
                    'child_seat_charge',
                    'wheel_chair_charge',
                    'extimated_delivery_time',
                    'near_by_airport_charges',
                    'child_capsule_charge',
                    'filter',
                    'luggage',
                    'handbags',
                    'passenger',
                    'no_of_wheelchair',
                    'no_of_childseat',
                    'no_of_childcapsule',
                    'include_airport_toll',
                    'created_at',
                    'airport_toll',
                    'gov_levy',
                    'amount_for_driver',
                    'app_earning',
                ]);

            // create booking Activity

            let dispatcherData = await this.model.admin.findOne({ _id: new Types.ObjectId(payload?.user_id), email: { $ne: 'admin@gmail.com' }, roles: { $in: [StaffRoles.dispatcher] } });

            console.log(dispatcherData);

            this.activityService.logActivity({
                booking_id: booking?._id.toString(),
                userId: booking?._id,
                action: "BOOKING_BROADCAST_START",
                resource: "booking",
                description: "Manually broadcast by " + dispatcherData?.name + " dispatcher : Start",
                payload: payload
            });

            // end


            await this.sent_broadcast_request(booking);

            return { message: "Request successfully broadcasting" };
        } catch (error) {
            throw error;
        }
    }

    async autoAssignRequest(id, payload) {
        try {

            const booking: any = await this.model.booking
                .findOne({ _id: id })
                .populate([
                    {
                        path: "customer_id",
                        select: 'connection_id socket_id current_booking name image',
                    },
                    {
                        path: "driver_id",
                        select: 'vehicle_type_id socket_id connection_id currently_send_ride_request_generate_at ride_status status socket_id connection_id currently_send_ride_request longitude latitude email country_code phone name image',
                    },
                    {
                        path: "company_id",
                        select: 'name email',
                    },
                    {
                        path: "vehicle_id",
                        select: 'vehicle_type image',
                    },
                    {
                        path: "vehicleDetail_id",
                        select: 'vehicle_photo driver_id vehicle_id name model number color',
                    },
                ])
                .select([
                    '_id',
                    'pickup_lat',
                    'pickup_long',
                    'company_id',
                    'dispatcher_id',
                    'driver_id',
                    'booking_id',
                    'request_type',
                    'sender_name',
                    'sender_country_code',
                    'sender_number',
                    'receiver_name',
                    'receiver_country_code',
                    'receiver_number',
                    'vehicle_id',
                    'pickup_address',
                    'drop_address',
                    'base_fee_without_addon',
                    'schedule_date',
                    'booking_status',
                    'booking_type',
                    'ride_status',
                    'is_ride_started',
                    'cancelled_by',
                    'payment_method',
                    'payment_status',
                    'distance_in_km',
                    'base_fee',
                    'base_fee_with_discount',
                    'stop_charges',
                    'surcharge_amount',
                    'toll_price',
                    'tip_driver',
                    'gst',
                    'coupon_discount',
                    'total_amount',
                    'total_trip_amount',
                    'child_seat_charge',
                    'wheel_chair_charge',
                    'extimated_delivery_time',
                    'near_by_airport_charges',
                    'child_capsule_charge',
                    'filter',
                    'luggage',
                    'handbags',
                    'passenger',
                    'no_of_wheelchair',
                    'no_of_childseat',
                    'no_of_childcapsule',
                    'include_airport_toll',
                    'created_at',
                    'airport_toll',
                    'gov_levy',
                    'amount_for_driver',
                    'app_earning',
                    'is_currently_broadcasting'
                ]);

            if (booking.is_currently_broadcasting === true) {
                return { message: "Auto-assign loop is currently running. Please wait before sending another request." }
            }

            await this.model.booking.findOneAndUpdate(
                { _id: booking._id },
                { $set: { is_currently_broadcasting: true, broadcasted_driver_ids: [] } },
                { new: true }
            );
            // create booking Activity
            let dispatcherData = await this.model.admin.findOne({ _id: new Types.ObjectId(payload?.user_id), email: { $ne: 'admin@gmail.com' }, roles: { $in: [StaffRoles.dispatcher] } });

            await this.activityService.logActivity({
                booking_id: booking?._id.toString(),
                userId: booking?.customer_id,
                action: "BOOKING_BROADCAST",
                resource: "booking",
                description: "Manually Searching for available drivers within a 7 km radius by " + dispatcherData?.name + " dispatcher : Start",
                payload: { booking_type: BookingType.Schedule },
            });
            // end

            setImmediate(async () => {
                try {
                    await this.sent_broadcast_request_under_7_km(booking, "Auto");

                    await this.model.booking.findOneAndUpdate(
                        { _id: booking._id },
                        { $set: { is_currently_broadcasting: false } },
                        { new: true }
                    );

                    await this.model.customers.updateOne(
                        { _id: booking.customer_id },
                        { current_booking: booking._id }
                    );
                } catch (err) {
                    console.error("Error in background broadcast request:", err);
                    await this.model.booking.findOneAndUpdate(
                        { _id: booking._id },
                        { $set: { is_currently_broadcasting: false } }
                    );
                }
            });

            // await this.sent_broadcast_request_under_7_km(booking, "Auto");

            // await this.model.booking.findOneAndUpdate(
            //     { _id: booking._id },
            //     { $set: { is_currently_broadcasting: false } },
            //     { new: true }
            // );

            // await this.model.customers.updateOne(
            //     { _id: booking.customer_id },
            //     { current_booking: booking._id }
            // );

            return { message: "Request successfully broadcasting" };
        } catch (error) {
            throw error
        }
    }

    // async sent_email_booking_otp(name, otp, email, waiting_charge, date) {
    //     try {
    //         let file_path = path.join(
    //             __dirname,
    //             "../../dist/email-template/accept_ride_otp.hbs"
    //         );

    //         let html = fs.readFileSync(file_path, { encoding: "utf-8" });
    //         const template = Handlebars.compile(html);
    //         const data = {
    //             name: name,
    //             otp: otp,
    //             date: date,
    //             waiting_charge: waiting_charge
    //         };
    //         const htmlToSend = template(data);

    //         let mailData = {
    //             to: email,
    //             subject: `Your Ride Booking OTP`,
    //             html: htmlToSend,
    //         };

    //         this.commonService.sendmail(
    //             mailData.to,
    //             mailData.subject,
    //             null,
    //             mailData.html
    //         );
    //     } catch (error) {
    //         throw error;
    //     }
    // }

    getAllowedVehicleTypes(selectedType: string, passenger: number): string[] {
        if (selectedType === 'Sedan') return ['Sedan'];
        if (selectedType === 'SUV') {
            if (passenger <= 6) return ['SUV'];
            return ['SUV', 'Minibus'];
        }
        return ['Minibus'];
    }


    async sent_broadcast_request(booking: any, broadcast_type = "Manual") {
        try {
            const {
                vehicle_id,
                pickup_lat,
                pickup_long,
                cancelled_driver_ids = [],
                no_of_wheelchair,
                no_of_childseat,
                no_of_childcapsule,
                include_airport_toll,
                base_fee,
                _id: bookingId,
                passenger
            } = booking;

            const queryFilter: any = {
                vehicle_id: vehicle_id._id,
                status: "active",
            };

            if (no_of_wheelchair) queryFilter.wheel_chair_availabilty = true;
            if (no_of_childseat) queryFilter.child_seat_availabilty = true;
            if (no_of_childcapsule) queryFilter.child_capsule_availabilty = true;


            if (passenger >= 4) {
                const vehicleTypes = await this.model.vehicleType.find({}, { vehicle_type: 1 }).lean();

                if (vehicleTypes.length > 0) {
                    const sedan = vehicleTypes.find(v => v.vehicle_type === "Sedan");
                    const suv = vehicleTypes.find(v => v.vehicle_type === "SUV");
                    const minibus = vehicleTypes.find(v => v.vehicle_type === "Minibus");

                    const currentVehicleId = vehicle_id._id.toString();

                    if (currentVehicleId === sedan._id.toString()) {
                        queryFilter.vehicle_id = { $in: [sedan._id, suv._id] };
                    } else if (currentVehicleId === suv._id.toString()) {
                        queryFilter.vehicle_id = { $in: [suv._id, minibus._id] };
                    }
                }
            }

            console.log('queryFilter', JSON.stringify(queryFilter))

            // const vehicleType = await this.model.vehicleType.findOne(
            //     { _id: vehicle_id },
            //     { vehicle_type: 1, _id: 0 }
            // ).lean();

            // const vehicleTypeName = vehicleType?.vehicle_type;
            // console.log('vehicleTypeName', vehicleTypeName)

            // let skipSeatFilter = false;
            // if (vehicleTypeName === 'Sedan' && passenger <= 4) {
            //     skipSeatFilter = true;
            // }
            // if (vehicleTypeName === 'SUV' && passenger <= 6) {
            //     skipSeatFilter = true;
            // }
            // if (vehicleTypeName === 'Minibus') {
            //     skipSeatFilter = true;
            // }

            // const vehicleTypeMapping = vehicleSeatBookingMapByType[vehicleTypeName] || {};
            // const allSeats = Object.keys(vehicleTypeMapping).map(Number);
            // const allowedSeats = allSeats.filter(seat =>
            //     vehicleTypeMapping[seat].includes(passenger)
            // );
            // const minSeat = Math.min(...allowedSeats);
            // const escalatedSeats = allSeats.filter(seat => seat >= minSeat);
            // console.log('escalatedSeats', escalatedSeats)

            // const allowedVehicleTypes = this.getAllowedVehicleTypes(vehicleTypeName, passenger);

            // console.log('allowedVehicleTypes', allowedVehicleTypes)

            // const vehicleTypeIds = await this.model.vehicleType.find(
            //     { vehicle_type: { $in: allowedVehicleTypes } },
            //     { _id: 1 }
            // ).lean();
            // const vehicleTypeIdList = vehicleTypeIds.map(v => v._id);

            // if (!skipSeatFilter) {
            //     const vehicleTypeMapping = vehicleSeatBookingMapByType[vehicleTypeName] || {};
            //     const allSeats = Object.keys(vehicleTypeMapping).map(Number);
            //     const allowedSeats = allSeats.filter(seat =>
            //         vehicleTypeMapping[seat].includes(passenger)
            //     );
            //     const minSeat = Math.min(...allowedSeats);
            //     const escalatedSeats = allSeats.filter(seat => seat >= minSeat);

            //     queryFilter.no_of_seat = { $in: escalatedSeats };
            // }

            // queryFilter.no_of_seat = { $in: escalatedSeats };
            // queryFilter.vehicle_id = { $in: vehicleTypeIdList };

            console.log('vehicleFilters.vehicle_id', queryFilter.vehicle_id)

            const [config, driversIds] = await Promise.all([
                this.model.appConfiguration.findOne(),
                this.model.vehicle_detail.distinct("driver_id", queryFilter),
            ]);

            console.log('driversIds >>>>>>>>>>>>', driversIds)

            const radius = 25 * 1000; // 25 km
            const nearbyDrivers = await this.model.drivers.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: [parseFloat(pickup_long), parseFloat(pickup_lat)],
                        },
                        distanceField: "distance",
                        spherical: true,
                        maxDistance: radius,
                    },
                },
                {
                    $lookup: {
                        from: 'vehiclesprices', // The collection name for customers
                        let: { id: '$vehicle_type_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [{ $eq: ['$vehicle_id', '$$id'] }],
                                    },
                                },
                            },
                            {
                                $project: {
                                    handbags: 1,
                                    luggage: 1,
                                    passenger: 1,
                                }
                            }
                        ],
                        as: 'vehiclesprices',
                    },
                },
                {
                    $unwind: {
                        path: "$vehiclesprices",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        // _id: { $in: driversIds, $nin: cancelled_driver_ids },
                        _id: { $in: driversIds },
                        status: DriverStatus.Online,
                        is_deleted: false,
                        is_approved: true,
                        currently_send_ride_request: false,
                        doc_expiry_type: { $eq: null },
                        ...(booking.handbags && { "vehiclesprices.handbags": { $gte: booking.handbags } }),
                        ...(booking.luggage && { "vehiclesprices.luggage": { $gte: booking.luggage } }),
                        ...(booking.passenger && { "vehiclesprices.passenger": { $gte: booking.passenger } }),
                    }
                },
                { $sort: { distance: 1 } },
                {
                    $project: {
                        _id: 1,
                        driver_id: "$_id",
                        name: 1,
                        distance: 1,
                        commission: 1,
                    },
                },
                { $limit: 1000 }
            ]);

            console.log(`nearbyDrivers ${radius} ========>>> `, nearbyDrivers)

            const [titleLoc, descLoc] = await Promise.all([
                this.commonService.localization("english", "send_booking_req_title"),
                this.commonService.localization("english", "send_booking_req_description"),
            ]);

            const pushData = {
                title: titleLoc.english,
                message: `Date/Time: ${momentTz(booking.schedule_date).tz(process.env.APP_TIMEZONE || 'Australia/Sydney').format('DD/MM/YYYY HH:mm')}
Pickup: ${booking.pickup_address}
Drop-off: ${booking.drop_address}
Trip price: $${booking.amount_for_driver}`,
            };

            var driver_name = "";

            // const booking_data = await this.model.booking.findById(bookingId).lean();
            await Promise.all(
                nearbyDrivers.map(async (driver) => {
                    try {
                        const fcmSession = await this.model.sessions.findOne({
                            user_id: driver._id,
                            scope: "driver",
                        });

                        // const commission = driver.commission ?? 0;
                        // const baseFeeAfterCommission = base_fee - (base_fee * commission) / 100;
                        // const airportToll = include_airport_toll ? config?.airport_toll || 0 : 0;
                        // const amountForDriver = baseFeeAfterCommission + airportToll;
                        // booking.amount_for_driver = amountForDriver;

                        const dataPush = {
                            booking: booking,
                            type: "booking_request",
                            req_type: "broadcast",
                            generated_at: Date.now(),
                        };


                        console.log('fcmSession?.fcm_token', {
                            user_____: fcmSession?.user_id,
                            fcm_token: fcmSession?.fcm_token,
                            device_type: fcmSession.device_type
                        })

                        // fcmSession.device_type === "ios" ? await this.notification.send_apn_notification(pushData, String(fcmSession?.fcm_token), dataPush) :
                        await this.notification.send_notification(pushData, fcmSession?.fcm_token, dataPush, fcmSession?.device_type);

                        await this.model.drivers.updateOne(
                            { _id: driver._id },
                            {
                                currently_send_ride_request: true,
                                currently_send_ride_request_id: bookingId,
                                currently_send_ride_request_generate_at: Date.now(),
                            }
                        );

                        console.log("driver._id", driver._id);

                        let driverData = await this.model.drivers.findById({ _id: new mongosse.Types.ObjectId(driver._id) });

                        //driver_name += driverData?.name+",";  

                        //console.log(driver_name);    

                        // create booking Activity
                        this.activityService.logActivity({
                            booking_id: booking?._id.toString(),
                            userId: booking?._id.toString(),
                            action: "BOOKING_BROADCAST",
                            resource: "booking",
                            description: "Booking " + broadcast_type + " broadcast notification - " + driverData?.name,
                            payload: { driver_id: booking?._id.toString() }
                        });
                        // end 

                    } catch (err) {
                        console.error("Broadcast notification failed for driver:", driver._id);
                        // create booking Activity
                        // this.activityService.logActivity({
                        //     booking_id: booking?._id.toString(),
                        //     userId: driver._id,
                        //     action: "BOOKING_BROADCAST_FAIL",
                        //     resource: "booking",
                        //     description: "Broadcast notification failed ",
                        //     payload: { driver_id: driver._id }
                        // });
                        // end
                    }

                })
            );


        } catch (error) {

            //booking Activity

            this.activityService.logActivity({
                booking_id: booking?._id.toString(),
                userId: booking?.driver_id,
                action: "BOOKING_BROADCAST_FAIL",
                resource: "booking",
                description: "Error in sent_broadcast_request",
                payload: { driver_id: booking?.driver_id }
            });

            // end

            console.error("Error in sent_broadcast_request:", error);
            throw error;
        }
    }
    //     old
    //     async sent_broadcast_request(booking: any, broadcast_type = "Manual") {
    //         try {
    //             const {
    //                 vehicle_id,
    //                 pickup_lat,
    //                 pickup_long,
    //                 cancelled_driver_ids = [],
    //                 no_of_wheelchair,
    //                 no_of_childseat,
    //                 no_of_childcapsule,
    //                 include_airport_toll,
    //                 base_fee,
    //                 _id: bookingId,
    //                 passenger
    //             } = booking;

    //             const queryFilter: any = {
    //                 // vehicle_id: vehicle_id._id,
    //                 status: "active",
    //             };

    //             if (no_of_wheelchair) queryFilter.wheel_chair_availabilty = true;
    //             if (no_of_childseat) queryFilter.child_seat_availabilty = true;
    //             if (no_of_childcapsule) queryFilter.child_capsule_availabilty = true;

    //             console.log('queryFilter', JSON.stringify(queryFilter))

    //             const vehicleType = await this.model.vehicleType.findOne(
    //                 { _id: vehicle_id },
    //                 { vehicle_type: 1, _id: 0 }
    //             ).lean();

    //             const vehicleTypeName = vehicleType?.vehicle_type;
    //             console.log('vehicleTypeName', vehicleTypeName)

    //             let skipSeatFilter = false;
    //             if (vehicleTypeName === 'Sedan' && passenger <= 4) {
    //                 skipSeatFilter = true;
    //             }
    //             if (vehicleTypeName === 'SUV' && passenger <= 6) {
    //                 skipSeatFilter = true;
    //             }
    //             if (vehicleTypeName === 'Minibus') {
    //                 skipSeatFilter = true;
    //             }

    //             const vehicleTypeMapping = vehicleSeatBookingMapByType[vehicleTypeName] || {};
    //             const allSeats = Object.keys(vehicleTypeMapping).map(Number);
    //             const allowedSeats = allSeats.filter(seat =>
    //                 vehicleTypeMapping[seat].includes(passenger)
    //             );
    //             const minSeat = Math.min(...allowedSeats);
    //             const escalatedSeats = allSeats.filter(seat => seat >= minSeat);
    //             console.log('escalatedSeats', escalatedSeats)

    //             const allowedVehicleTypes = this.getAllowedVehicleTypes(vehicleTypeName, passenger);

    //             console.log('allowedVehicleTypes', allowedVehicleTypes)

    //             const vehicleTypeIds = await this.model.vehicleType.find(
    //                 { vehicle_type: { $in: allowedVehicleTypes } },
    //                 { _id: 1 }
    //             ).lean();
    //             const vehicleTypeIdList = vehicleTypeIds.map(v => v._id);

    //             if (!skipSeatFilter) {
    //                 const vehicleTypeMapping = vehicleSeatBookingMapByType[vehicleTypeName] || {};
    //                 const allSeats = Object.keys(vehicleTypeMapping).map(Number);
    //                 const allowedSeats = allSeats.filter(seat =>
    //                     vehicleTypeMapping[seat].includes(passenger)
    //                 );
    //                 const minSeat = Math.min(...allowedSeats);
    //                 const escalatedSeats = allSeats.filter(seat => seat >= minSeat);

    //                 queryFilter.no_of_seat = { $in: escalatedSeats };
    //             }

    //             // queryFilter.no_of_seat = { $in: escalatedSeats };
    //             // queryFilter.vehicle_id = { $in: vehicleTypeIdList };

    //             console.log('vehicleFilters.vehicle_id', queryFilter.vehicle_id)

    //             const [config, driversIds] = await Promise.all([
    //                 this.model.appConfiguration.findOne(),
    //                 this.model.vehicle_detail.distinct("driver_id", queryFilter),
    //             ]);

    //             console.log('driversIds >>>>>>>>>>>>', driversIds)

    //             const radius = 25 * 1000; // 25 km
    //             const nearbyDrivers = await this.model.drivers.aggregate([
    //                 {
    //                     $geoNear: {
    //                         near: {
    //                             type: "Point",
    //                             coordinates: [parseFloat(pickup_long), parseFloat(pickup_lat)],
    //                         },
    //                         distanceField: "distance",
    //                         spherical: true,
    //                         maxDistance: radius,
    //                     },
    //                 },
    //                 {
    //                     $lookup: {
    //                         from: 'vehiclesprices', // The collection name for customers
    //                         let: { id: '$vehicle_type_id' },
    //                         pipeline: [
    //                             {
    //                                 $match: {
    //                                     $expr: {
    //                                         $and: [{ $eq: ['$vehicle_id', '$$id'] }],
    //                                     },
    //                                 },
    //                             },
    //                             {
    //                                 $project: {
    //                                     handbags: 1,
    //                                     luggage: 1,
    //                                     passenger: 1,
    //                                 }
    //                             }
    //                         ],
    //                         as: 'vehiclesprices',
    //                     },
    //                 },
    //                 {
    //                     $unwind: {
    //                         path: "$vehiclesprices",
    //                         preserveNullAndEmptyArrays: true
    //                     }
    //                 },
    //                 {
    //                     $match: {
    //                         // _id: { $in: driversIds, $nin: cancelled_driver_ids },
    //                         _id: { $in: driversIds },
    //                         status: DriverStatus.Online,
    //                         is_deleted: false,
    //                         is_approved: true,
    //                         currently_send_ride_request: false,
    //                         doc_expiry_type: { $eq: null },
    //                         ...(booking.handbags && { "vehiclesprices.handbags": { $gte: booking.handbags } }),
    //                         ...(booking.luggage && { "vehiclesprices.luggage": { $gte: booking.luggage } }),
    //                         ...(booking.passenger && { "vehiclesprices.passenger": { $gte: booking.passenger } }),
    //                     }
    //                 },
    //                 { $sort: { distance: 1 } },
    //                 {
    //                     $project: {
    //                         _id: 1,
    //                         driver_id: "$_id",
    //                         name: 1,
    //                         distance: 1,
    //                         commission: 1,
    //                     },
    //                 },
    //                 { $limit: 1000 }
    //             ]);

    //             console.log(`nearbyDrivers ${radius} ========>>> `, nearbyDrivers)

    //             const [titleLoc, descLoc] = await Promise.all([
    //                 this.commonService.localization("english", "send_booking_req_title"),
    //                 this.commonService.localization("english", "send_booking_req_description"),
    //             ]);

    //             const pushData = {
    //                 title: titleLoc.english,
    //                 message: `Date/Time: ${momentTz(booking.schedule_date).tz('Asia/Kolkata').format('DD/MM/YYYY HH:mm')}
    // Pickup: ${booking.pickup_address}
    // Drop-off: ${booking.drop_address}
    // Trip price: $${booking.amount_for_driver}`,
    //             };

    //             var driver_name = "";

    //             // const booking_data = await this.model.booking.findById(bookingId).lean();
    //             await Promise.all(
    //                 nearbyDrivers.map(async (driver) => {
    //                     try {
    //                         const fcmSession = await this.model.sessions.findOne({
    //                             user_id: driver._id,
    //                             scope: "driver",
    //                         });

    //                         // const commission = driver.commission ?? 0;
    //                         // const baseFeeAfterCommission = base_fee - (base_fee * commission) / 100;
    //                         // const airportToll = include_airport_toll ? config?.airport_toll || 0 : 0;
    //                         // const amountForDriver = baseFeeAfterCommission + airportToll;
    //                         // booking.amount_for_driver = amountForDriver;

    //                         const dataPush = {
    //                             booking: booking,
    //                             type: "booking_request",
    //                             req_type: "broadcast",
    //                             generated_at: Date.now(),
    //                         };


    //                         console.log('fcmSession?.fcm_token', {
    //                             user_____: fcmSession?.user_id,
    //                             fcm_token: fcmSession?.fcm_token,
    //                             device_type: fcmSession.device_type
    //                         })

    //                         // fcmSession.device_type === "ios" ? await this.notification.send_apn_notification(pushData, String(fcmSession?.fcm_token), dataPush) :
    //                         await this.notification.send_notification(pushData, fcmSession?.fcm_token, dataPush, fcmSession?.device_type);

    //                         await this.model.drivers.updateOne(
    //                             { _id: driver._id },
    //                             {
    //                                 currently_send_ride_request: true,
    //                                 currently_send_ride_request_id: bookingId,
    //                                 currently_send_ride_request_generate_at: Date.now(),
    //                             }
    //                         );

    //                         console.log("driver._id", driver._id);

    //                         let driverData = await this.model.drivers.findById({ _id: new mongosse.Types.ObjectId(driver._id) });

    //                         //driver_name += driverData?.name+",";  

    //                         //console.log(driver_name);    

    //                         // create booking Activity
    //                         this.activityService.logActivity({
    //                             booking_id: booking?._id.toString(),
    //                             userId: booking?._id.toString(),
    //                             action: "BOOKING_BROADCAST",
    //                             resource: "booking",
    //                             description: "Booking " + broadcast_type + " broadcast notification - " + driverData?.name,
    //                             payload: { driver_id: booking?._id.toString() }
    //                         });
    //                         // end 

    //                     } catch (err) {
    //                         console.error("Broadcast notification failed for driver:", driver._id);
    //                         // create booking Activity
    //                         // this.activityService.logActivity({
    //                         //     booking_id: booking?._id.toString(),
    //                         //     userId: driver._id,
    //                         //     action: "BOOKING_BROADCAST_FAIL",
    //                         //     resource: "booking",
    //                         //     description: "Broadcast notification failed ",
    //                         //     payload: { driver_id: driver._id }
    //                         // });
    //                         // end
    //                     }

    //                 })
    //             );


    //         } catch (error) {

    //             //booking Activity

    //             this.activityService.logActivity({
    //                 booking_id: booking?._id.toString(),
    //                 userId: booking?.driver_id,
    //                 action: "BOOKING_BROADCAST_FAIL",
    //                 resource: "booking",
    //                 description: "Error in sent_broadcast_request",
    //                 payload: { driver_id: booking?.driver_id }
    //             });

    //             // end

    //             console.error("Error in sent_broadcast_request:", error);
    //             throw error;
    //         }
    //     }

    private groupAndPreserveSort = (drivers: any) => {
        const buckets = {
            Sedan: [],
            SUV: [],
            Minibus: []
        };

        drivers.forEach((driver: any) => {
            if (buckets[driver.vehicle_type]) {
                buckets[driver.vehicle_type].push(driver);
            }
        });

        const combined = [...buckets.Sedan, ...buckets.SUV, ...buckets.Minibus];

        // ✅ Return an array with only the first element if exists
        return combined;
    };

    private fetchDrivers = async (bookingId: string, pickup_long, pickup_lat, radius = 7, vehicleFilters: any, handbags, luggage, passenger, broadcasted_driver_ids: any[]) => {
        console.log('broadcasted_driver_ids', broadcasted_driver_ids)
        try {
            const start_of_day = momentTz().tz(process.env.APP_TIMEZONE || 'Australia/Sydney').startOf('day');
            const driversIds = await this.model.vehicle_detail.distinct("driver_id", vehicleFilters);

            const data = await this.model.drivers.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: [parseFloat(pickup_long), parseFloat(pickup_lat)],
                        },
                        distanceField: "distance",
                        spherical: true,
                        maxDistance: radius,
                    },
                },
                {
                    $lookup: {
                        from: 'vehiclesprices',
                        let: { id: '$vehicle_type_id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$vehicle_id', '$$id'] } } },
                            { $project: { handbags: 1, luggage: 1, passenger: 1 } },
                        ],
                        as: 'vehiclesprices',
                    },
                },
                { $unwind: { path: "$vehiclesprices", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'bookings',
                        let: { id: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$driver_id', '$$id'] },
                                    schedule_date: { $gte: start_of_day.toDate() },
                                    booking_status: { $in: [BookingStatus.Completed] },
                                },
                            },
                            { $project: { _id: 1 } },
                        ],
                        as: 'bookings',
                    },
                },
                {
                    $lookup: {
                        from: 'declined_bookings',
                        let: { driverId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$driver_id', '$$driverId'] },
                                            { $eq: ['$booking_id', new mongoose.Types.ObjectId(bookingId)] },
                                            { $eq: ['$status', 'decline'] },
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'declined_bookings'
                    }
                },
                {
                    $match: {
                        declined_bookings: { $size: 0 }
                    }
                },
                {
                    $addFields: {
                        driver_ride_completed_counts: { $size: "$bookings" },
                    },
                },
                {
                    $match: {
                        _id: {
                            $in: driversIds,
                            $nin: broadcasted_driver_ids || []
                        },
                        status: DriverStatus.Online,
                        is_deleted: false,
                        is_approved: true,
                        currently_send_ride_request: false,
                        doc_expiry_type: null,
                        ...(handbags && { "vehiclesprices.handbags": { $gte: handbags } }),
                        ...(luggage && { "vehiclesprices.luggage": { $gte: luggage } }),
                        ...(passenger && { "vehiclesprices.passenger": { $gte: passenger } }),
                    },
                },
                {
                    $lookup: {
                        from: "vehicle_types",
                        let: { id: "$vehicle_type_id" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
                            { $project: { vehicle_type: 1, } }
                        ],
                        as: "vehicle_type"
                    }
                },
                { $unwind: { path: "$vehicle_type", preserveNullAndEmptyArrays: true } },
                { $sort: { driver_ride_completed_counts: 1, distance: 1 } },
                {
                    $project: {
                        _id: 1,
                        driver_id: "$_id",
                        name: 1,
                        distance: 1,
                        commission: 1,
                        driver_ride_completed_counts: 1,
                        vehicle_type: "$vehicle_type.vehicle_type"
                    },
                },
            ]);

            const sortedWithVehicleType = this.groupAndPreserveSort(data) //in order Sedan - SUV - Minibus
            return sortedWithVehicleType;
        } catch (error) {
            console.log('ERROR IN [fetchDrivers] =>', error)
        }
    }


    //upgradation logic with while loop
    async sent_broadcast_request_under_7_km(booking: any, broadcast_type = "Auto") {
        const BROADCAST_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        const INTERVAL = 30 * 1000; // check every 30 seconds
        try {
            const {
                pickup_lat,
                pickup_long,
                no_of_wheelchair,
                no_of_childseat,
                no_of_childcapsule,
                _id: bookingId,
                handbags,
                luggage,
                passenger,
                vehicle_id,
                broadcasted_driver_ids = []
            } = booking;

            const startTime = Date.now();
            let driversToTry = [];

            // ------------ PHASE 1: Exact vehicle_id match ------------
            const exactFilters: any = {
                status: "active",
                vehicle_id: vehicle_id?._id,
            };
            if (no_of_wheelchair) exactFilters.wheel_chair_availabilty = true;
            if (no_of_childseat) exactFilters.child_seat_availabilty = true;
            if (no_of_childcapsule) exactFilters.child_capsule_availabilty = true;

            if (passenger >= 4) {
                const vehicleTypes = await this.model.vehicleType.find({}, { vehicle_type: 1 }).lean();

                if (vehicleTypes.length > 0) {
                    const sedan = vehicleTypes.find(v => v.vehicle_type === "Sedan");
                    const suv = vehicleTypes.find(v => v.vehicle_type === "SUV");
                    const minibus = vehicleTypes.find(v => v.vehicle_type === "Minibus");

                    const currentVehicleId = vehicle_id._id.toString();

                    if (currentVehicleId === sedan._id.toString()) {
                        exactFilters.vehicle_id = { $in: [sedan._id, suv._id] };
                    } else if (currentVehicleId === suv._id.toString()) {
                        exactFilters.vehicle_id = { $in: [suv._id, minibus._id] };
                    }
                }
            }

            console.log("exactFilters", exactFilters)

            const radius = 7 * 1000;

            while (Date.now() - startTime < BROADCAST_TIMEOUT) {
                const vehicleType = await this.model.vehicleType.findOne(
                    { _id: vehicle_id },
                    { vehicle_type: 1 }
                ).lean();

                const vehicleTypeName = vehicleType?.vehicle_type;

                const booking_status = await this.model.booking.findOne(
                    { _id: bookingId },
                    { status: 1, driver_id: 1, broadcasted_driver_ids: 1 }
                );

                // If driver is assigned or status changed, stop
                if (booking_status?.booking_status === BookingStatus.Accept || booking_status?.driver_id) {
                    console.log("Booking status changed or driver assigned, wait for 30 to recheck");
                    await new Promise(resolve => setTimeout(resolve, 30 * 1000));
                    continue;
                }

                const exist_ = await this.activityService.getActivityWithTypeOne({
                    booking_id: bookingId.toString(),
                    action: "BOOKING_BROADCAST_1",
                })

                if (exist_) {
                    await this.activityService.logActivity({
                        booking_id: bookingId.toString(),
                        userId: bookingId.toString(),
                        action: "BOOKING_BROADCAST_1",
                        resource: "booking",
                        description: `Searching for - ${vehicleTypeName} driver`,
                        payload: { driver_id: bookingId.toString() },
                    });
                }

                driversToTry = await this.fetchDrivers(
                    bookingId,
                    pickup_long,
                    pickup_lat,
                    radius,
                    exactFilters,
                    handbags,
                    luggage,
                    passenger,
                    booking_status.broadcasted_driver_ids
                );

                console.log("driversToTry", driversToTry)
                if (driversToTry.length > 0) {
                    // await this.activityService.logActivity({
                    //     booking_id: bookingId.toString(),
                    //     userId: bookingId.toString(),
                    //     action: "BOOKING_BROADCAST",
                    //     resource: "booking",
                    //     description: driversToTry.length ? `Search: ${driversToTry.length} driver found` : `driver not found`,
                    //     payload: { driver_id: bookingId.toString() },
                    // });

                    const [titleLoc, descLoc] = await Promise.all([
                        this.commonService.localization("english", "send_booking_req_title"),
                        this.commonService.localization("english", "send_booking_req_description"),
                    ]);

                    const pushData = {
                        title: titleLoc.english,
                        message: `📅 ${momentTz(booking.schedule_date).tz(process.env.APP_TIMEZONE || 'Australia/Sydney').format('DD/MM/YYYY HH:mm')}
    📍 From: ${booking.pickup_address}
    📍 To: ${booking.drop_address}
    💰 Trip fare: $${booking.amount_for_driver}`,
                    };

                    for (const driver of driversToTry) {
                        if (Date.now() - startTime > BROADCAST_TIMEOUT) {
                            console.log("Broadcast loop exceeded 5-minute timeout.");
                            break;
                        }

                        try {
                            const fcmSession = await this.model.sessions.findOne({
                                user_id: driver._id,
                                scope: "driver",
                            });

                            const dataPush = {
                                booking,
                                type: "booking_request",
                                generated_at: Date.now(),
                            };

                            await this.notification.send_notification(pushData, fcmSession?.fcm_token, dataPush, fcmSession?.device_type);

                            await this.model.booking.updateOne(
                                { _id: bookingId },
                                { $addToSet: { broadcasted_driver_ids: driver._id } }
                            );

                            const driverData = await this.model.drivers.findById(driver._id);

                            await this.activityService.logActivity({
                                booking_id: bookingId.toString(),
                                userId: bookingId.toString(),
                                action: "BOOKING_BROADCAST",
                                resource: "booking",
                                description: `Booking request goes to - ${driverData?.name}`,
                                payload: { driver_id: bookingId.toString() },
                            });

                        } catch (err) {
                            console.error("Broadcast notification failed for driver:", driver._id);
                        }
                        break;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, INTERVAL));
            }
        } catch {
            await this.activityService.logActivity({
                booking_id: booking?._id?.toString(),
                userId: booking?.driver_id,
                action: "BOOKING_BROADCAST_FAIL",
                resource: "booking",
                description: "Error in sent_broadcast_request",
                payload: { driver_id: booking?.driver_id },
            });

            console.error("Error in sent_broadcast_request:", error);
            throw error;
        }
    }

    // old logic without vehicle upgradation
    //     async sent_broadcast_request_under_7_km(booking: any, broadcast_type = "Auto") {
    //         const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    //         const BROADCAST_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    //         const DRIVER_PUSH_DELAY = 30 * 1000;
    //         const INTERVAL = 30 * 1000; // check every 30 seconds
    //         const startTime = Date.now();

    //         try {
    //             const {
    //                 pickup_lat,
    //                 pickup_long,
    //                 no_of_wheelchair,
    //                 no_of_childseat,
    //                 no_of_childcapsule,
    //                 _id: bookingId,
    //                 handbags,
    //                 luggage,
    //                 passenger,
    //                 vehicle_id,
    //                 broadcasted_driver_ids = []
    //             } = booking;

    //             const startTime = Date.now();
    //             let driversToTry = [];

    //             // ------------ PHASE 1: Exact vehicle_id match ------------
    //             const exactFilters: any = {
    //                 status: "active",
    //                 vehicle_id: vehicle_id?._id,
    //             };
    //             if (no_of_wheelchair) exactFilters.wheel_chair_availabilty = true;
    //             if (no_of_childseat) exactFilters.child_seat_availabilty = true;
    //             if (no_of_childcapsule) exactFilters.child_capsule_availabilty = true;

    //             const radius = 7 * 1000;

    //             await this.model.booking.findOneAndUpdate(
    //                 { _id: bookingId },
    //                 { $set: { is_broadcast_7_km: true } },
    //                 { new: true }
    //             );

    //             // Loop until timeout or booking assigned
    //             while (Date.now() - startTime < BROADCAST_TIMEOUT) {

    //                 const vehicleType = await this.model.vehicleType.findOne(
    //                     { _id: vehicle_id },
    //                     { vehicle_type: 1 }
    //                 ).lean();

    //                 const vehicleTypeName = vehicleType?.vehicle_type;

    //                 const booking_status = await this.model.booking.findOne(
    //                     { _id: bookingId },
    //                     { status: 1, driver_id: 1, broadcasted_driver_ids: 1 }
    //                 );

    //                 // If driver is assigned or status changed, stop
    //                 if (booking_status?.booking_status === BookingStatus.Accept || booking_status?.driver_id) {
    //                     console.log("Booking status changed or driver assigned, exiting loop.");
    //                     return;
    //                 }

    //                 const exist_ = await this.activityService.getActivityWithTypeOne({
    //                     booking_id: bookingId.toString(),
    //                     action: "BOOKING_BROADCAST_1",
    //                 })

    //                 if (exist_) {
    //                     await this.activityService.logActivity({
    //                         booking_id: bookingId.toString(),
    //                         userId: bookingId.toString(),
    //                         action: "BOOKING_BROADCAST_1",
    //                         resource: "booking",
    //                         description: `Searching for - ${vehicleTypeName} driver`,
    //                         payload: { driver_id: bookingId.toString() },
    //                     });
    //                 }

    //                 driversToTry = await this.fetchDrivers(
    //                     bookingId,
    //                     pickup_long,
    //                     pickup_lat,
    //                     radius,
    //                     exactFilters,
    //                     handbags,
    //                     luggage,
    //                     passenger,
    //                     booking_status.broadcasted_driver_ids
    //                 );

    //                 if (driversToTry.length > 0) {
    //                     await this.activityService.logActivity({
    //                         booking_id: bookingId.toString(),
    //                         userId: bookingId.toString(),
    //                         action: "BOOKING_BROADCAST",
    //                         resource: "booking",
    //                         description: driversToTry.length ? `Search: ${driversToTry.length} ${vehicleTypeName} driver found` : `${vehicleTypeName} driver not found`,
    //                         payload: { driver_id: bookingId.toString() },
    //                     });

    //                     const [titleLoc, descLoc] = await Promise.all([
    //                         this.commonService.localization("english", "send_booking_req_title"),
    //                         this.commonService.localization("english", "send_booking_req_description"),
    //                     ]);

    //                     const pushData = {
    //                         title: titleLoc.english,
    //                         message: `📅 ${momentTz(booking.schedule_date).tz('Asia/Kolkata').format('DD/MM/YYYY HH:mm')}
    // 📍 From: ${booking.pickup_address}
    // 📍 To: ${booking.drop_address}
    // 💰 Trip fare: $${booking.amount_for_driver}`,
    //                     };

    //                     for (const driver of driversToTry) {
    //                         if (Date.now() - startTime > BROADCAST_TIMEOUT) {
    //                             console.log("Broadcast loop exceeded 5-minute timeout.");
    //                             break;
    //                         }

    //                         try {
    //                             const fcmSession = await this.model.sessions.findOne({
    //                                 user_id: driver._id,
    //                                 scope: "driver",
    //                             });

    //                             const dataPush = {
    //                                 booking,
    //                                 type: "booking_request",
    //                                 generated_at: Date.now(),
    //                             };

    //                             await this.notification.send_notification(pushData, fcmSession?.fcm_token, dataPush, fcmSession?.device_type);

    //                             await this.model.booking.updateOne(
    //                                 { _id: bookingId },
    //                                 { $addToSet: { broadcasted_driver_ids: driver._id } }
    //                             );

    //                             const driverData = await this.model.drivers.findById(driver._id);

    //                             await this.activityService.logActivity({
    //                                 booking_id: bookingId.toString(),
    //                                 userId: bookingId.toString(),
    //                                 action: "BOOKING_BROADCAST",
    //                                 resource: "booking",
    //                                 description: `Booking request goes to - ${driverData?.name}`,
    //                                 payload: { driver_id: bookingId.toString() },
    //                             });

    //                         } catch (err) {
    //                             console.error("Broadcast notification failed for driver:", driver._id);
    //                         }
    //                     }
    //                 } else {
    //                     const vehicleType = await this.model.vehicleType.findOne(
    //                         { _id: vehicle_id },
    //                         { vehicle_type: 1 }
    //                     ).lean();

    //                     const vehicleTypeName = vehicleType?.vehicle_type;

    //                     let skipSeatFilter = false;
    //                     if (vehicleTypeName === 'Sedan' && passenger <= 4) skipSeatFilter = true;
    //                     if (vehicleTypeName === 'SUV' && passenger <= 6) skipSeatFilter = true;
    //                     if (vehicleTypeName === 'Minibus') skipSeatFilter = true;

    //                     const vehicleTypeMapping = vehicleSeatBookingMapByType[vehicleTypeName] || {};
    //                     const allSeats = Object.keys(vehicleTypeMapping).map(Number);
    //                     const allowedSeats = allSeats.filter(seat => vehicleTypeMapping[seat].includes(passenger));
    //                     const minSeat = Math.min(...allowedSeats);
    //                     const escalatedSeats = allSeats.filter(seat => seat >= minSeat);

    //                     const allowedVehicleTypes = this.getAllowedVehicleTypes(vehicleTypeName, passenger);
    //                     const vehicleTypeIds = await this.model.vehicleType.find(
    //                         { vehicle_type: { $in: allowedVehicleTypes } },
    //                         { _id: 1, vehicle_type: 1 }
    //                     ).lean();

    //                     const relaxedFilters: any = {
    //                         status: "active",
    //                         vehicle_type_id: { $in: vehicleTypeIds.map(v => v._id) },
    //                     };

    //                     const exist_ = await this.activityService.getActivityWithTypeOne({
    //                         booking_id: bookingId.toString(),
    //                         action: "BOOKING_BROADCAST_2",
    //                     })

    //                     if (exist_) {
    //                         await this.activityService.logActivity({
    //                             booking_id: bookingId.toString(),
    //                             userId: bookingId.toString(),
    //                             action: "BOOKING_BROADCAST_2",
    //                             resource: "booking",
    //                             description: `Searching for ${vehicleTypeIds.map(v => `${v.vehicle_type},`)} driver`,
    //                             payload: { driver_id: bookingId.toString() },
    //                         });
    //                     }


    //                     if (no_of_wheelchair) relaxedFilters.wheel_chair_availabilty = true;
    //                     if (no_of_childseat) relaxedFilters.child_seat_availabilty = true;
    //                     if (no_of_childcapsule) relaxedFilters.child_capsule_availabilty = true;
    //                     if (!skipSeatFilter) relaxedFilters.no_of_seat = { $in: escalatedSeats };

    //                     driversToTry = await this.fetchDrivers(
    //                         bookingId,
    //                         pickup_long,
    //                         pickup_lat,
    //                         radius,
    //                         relaxedFilters,
    //                         handbags,
    //                         luggage,
    //                         passenger,
    //                         booking_status.broadcasted_driver_ids
    //                     );

    //                     driversToTry.length ? await this.activityService.logActivity({
    //                         booking_id: bookingId.toString(),
    //                         userId: bookingId.toString(),
    //                         action: "BOOKING_BROADCAST",
    //                         resource: "booking",
    //                         description: `Search: ${driversToTry.length} ${allowedVehicleTypes} driver found`,
    //                         payload: { driver_id: bookingId.toString() },
    //                     }) : null;

    //                     const [titleLoc, descLoc] = await Promise.all([
    //                         this.commonService.localization("english", "send_booking_req_title"),
    //                         this.commonService.localization("english", "send_booking_req_description"),
    //                     ]);

    //                     const pushData = {
    //                         title: titleLoc.english,
    //                         message: `📅 ${momentTz(booking.schedule_date).tz('Asia/Kolkata').format('DD/MM/YYYY HH:mm')}
    // 📍 From: ${booking.pickup_address}
    // 📍 To: ${booking.drop_address}
    // 💰 Trip fare: $${booking.amount_for_driver}`,
    //                     };

    //                     for (const driver of driversToTry) {
    //                         if (Date.now() - startTime > BROADCAST_TIMEOUT) {
    //                             console.log("Broadcast loop exceeded 5-minute timeout.");
    //                             break;
    //                         }

    //                         try {
    //                             const fcmSession = await this.model.sessions.findOne({
    //                                 user_id: driver._id,
    //                                 scope: "driver",
    //                             });

    //                             const dataPush = {
    //                                 booking,
    //                                 type: "booking_request",
    //                                 generated_at: Date.now(),
    //                             };

    //                             await this.notification.send_notification(pushData, fcmSession?.fcm_token, dataPush, fcmSession?.device_type);

    //                             await this.model.booking.updateOne(
    //                                 { _id: bookingId },
    //                                 { $addToSet: { broadcasted_driver_ids: driver._id } }
    //                             );

    //                             const driverData = await this.model.drivers.findById(driver._id);

    //                             await this.activityService.logActivity({
    //                                 booking_id: bookingId.toString(),
    //                                 userId: bookingId.toString(),
    //                                 action: "BOOKING_BROADCAST",
    //                                 resource: "booking",
    //                                 description: `Booking request goes to - ${driverData?.name}`,
    //                                 payload: { driver_id: bookingId.toString() },
    //                             });

    //                         } catch (err) {
    //                             console.error("Broadcast notification failed for driver:", driver._id);
    //                         }
    //                     }
    //                 }

    //                 await new Promise(resolve => setTimeout(resolve, INTERVAL));
    //             }
    //         } catch (error) {
    //             await this.activityService.logActivity({
    //                 booking_id: booking?._id?.toString(),
    //                 userId: booking?.driver_id,
    //                 action: "BOOKING_BROADCAST_FAIL",
    //                 resource: "booking",
    //                 description: "Error in sent_broadcast_request",
    //                 payload: { driver_id: booking?.driver_id },
    //             });

    //             console.error("Error in sent_broadcast_request:", error);
    //             throw error;
    //         }
    //     }

    async sent_broadcast_request_under_7_km____(booking: any, broadcast_type = "Auto") {
        try {
            const start_of_day = momentTz().tz(process.env.APP_TIMEZONE || 'Australia/Sydney').startOf('day');

            const {
                pickup_lat,
                pickup_long,
                no_of_wheelchair,
                no_of_childseat,
                no_of_childcapsule,
                _id: bookingId,
                handbags,
                luggage,
                passenger,
                vehicle_id,
            } = booking;

            // Prepare vehicle query filters
            const vehicleFilters: any = { status: "active" };
            if (no_of_wheelchair) vehicleFilters.wheel_chair_availabilty = true;
            if (no_of_childseat) vehicleFilters.child_seat_availabilty = true;
            if (no_of_childcapsule) vehicleFilters.child_capsule_availabilty = true;

            const vehicleType = await this.model.vehicleType.findOne(
                { _id: vehicle_id },
                { vehicle_type: 1, _id: 0 }
            ).lean();

            const vehicleTypeName = vehicleType?.vehicle_type;
            console.log('vehicleTypeName', vehicleTypeName)

            let skipSeatFilter = false;
            if (vehicleTypeName === 'Sedan' && passenger <= 4) {
                skipSeatFilter = true;
            }
            if (vehicleTypeName === 'SUV' && passenger <= 6) {
                skipSeatFilter = true;
            }
            if (vehicleTypeName === 'Minibus') {
                skipSeatFilter = true;
            }

            const vehicleTypeMapping = vehicleSeatBookingMapByType[vehicleTypeName] || {};
            const allSeats = Object.keys(vehicleTypeMapping).map(Number);
            const allowedSeats = allSeats.filter(seat =>
                vehicleTypeMapping[seat].includes(passenger)
            );
            const minSeat = Math.min(...allowedSeats);
            const escalatedSeats = allSeats.filter(seat => seat >= minSeat);
            console.log('escalatedSeats', escalatedSeats)

            const allowedVehicleTypes = this.getAllowedVehicleTypes(vehicleTypeName, passenger);

            console.log('allowedVehicleTypes', allowedVehicleTypes)

            const vehicleTypeIds = await this.model.vehicleType.find(
                { vehicle_type: { $in: allowedVehicleTypes } },
                { _id: 1 }
            ).lean();
            const vehicleTypeIdList = vehicleTypeIds.map(v => v._id);

            if (!skipSeatFilter) {
                const vehicleTypeMapping = vehicleSeatBookingMapByType[vehicleTypeName] || {};
                const allSeats = Object.keys(vehicleTypeMapping).map(Number);
                const allowedSeats = allSeats.filter(seat =>
                    vehicleTypeMapping[seat].includes(passenger)
                );
                const minSeat = Math.min(...allowedSeats);
                const escalatedSeats = allSeats.filter(seat => seat >= minSeat);

                vehicleFilters.no_of_seat = { $in: escalatedSeats };
            }

            // vehicleFilters.no_of_seat = { $in: escalatedSeats };
            // vehicleFilters.vehicle_id = { $in: vehicleTypeIdList };

            console.log('vehicleFilters.vehicle_id', vehicleFilters.vehicle_id)

            const [config, driversIds] = await Promise.all([
                this.model.appConfiguration.findOne(),
                this.model.vehicle_detail.distinct("driver_id", vehicleFilters),
            ]);

            const radius = 7 * 1000; // 7km

            const nearbyDrivers = await this.model.drivers.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: [parseFloat(pickup_long), parseFloat(pickup_lat)],
                        },
                        distanceField: "distance",
                        spherical: true,
                        maxDistance: radius,
                    },
                },
                {
                    $lookup: {
                        from: 'vehiclesprices',
                        let: { id: '$vehicle_type_id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$vehicle_id', '$$id'] } } },
                            { $project: { handbags: 1, luggage: 1, passenger: 1 } },
                        ],
                        as: 'vehiclesprices',
                    },
                },
                { $unwind: { path: "$vehiclesprices", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'bookings',
                        let: { id: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$driver_id', '$$id'] },
                                    schedule_date: { $gte: start_of_day.toDate() },
                                    booking_status: { $in: [BookingStatus.Completed] },
                                },
                            },
                            { $project: { _id: 1 } },
                        ],
                        as: 'bookings',
                    },
                },
                {
                    $lookup: {
                        from: 'declined_bookings',
                        let: { driverId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$driver_id', '$$driverId'] },
                                            { $eq: ['$booking_id', new mongoose.Types.ObjectId(bookingId)] },
                                            { $eq: ['$status', 'decline'] },
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'declined_bookings'
                    }
                },
                {
                    $match: {
                        declined_bookings: { $size: 0 }
                    }
                },
                {
                    $addFields: {
                        driver_ride_completed_counts: { $size: "$bookings" },
                    },
                },
                {
                    $match: {
                        _id: {
                            $in: driversIds,
                            $nin: booking.broadcasted_driver_ids || []
                        },
                        status: DriverStatus.Online,
                        is_deleted: false,
                        is_approved: true,
                        currently_send_ride_request: false,
                        doc_expiry_type: null,
                        ...(handbags && { "vehiclesprices.handbags": { $gte: handbags } }),
                        ...(luggage && { "vehiclesprices.luggage": { $gte: luggage } }),
                        ...(passenger && { "vehiclesprices.passenger": { $gte: passenger } }),
                    },
                },
                { $sort: { driver_ride_completed_counts: 1, distance: 1 } },
                {
                    $project: {
                        _id: 1,
                        driver_id: "$_id",
                        name: 1,
                        distance: 1,
                        commission: 1,
                        driver_ride_completed_counts: 1,
                    },
                },
                { $limit: 1 },
            ]);

            const [titleLoc, descLoc] = await Promise.all([
                this.commonService.localization("english", "send_booking_req_title"),
                this.commonService.localization("english", "send_booking_req_description"),
            ]);

            const pushData = {
                title: titleLoc.english,
                message: `Date/Time: ${momentTz(booking.schedule_date).tz(process.env.APP_TIMEZONE || 'Australia/Sydney').format('DD/MM/YYYY HH:mm')}
Pickup: ${booking.pickup_address}
Drop-off: ${booking.drop_address}
Trip price: $${booking.amount_for_driver}`,
            };

            for (const driver of nearbyDrivers) {
                try {
                    const fcmSession = await this.model.sessions.findOne({
                        user_id: driver._id,
                        scope: "driver",
                    });

                    const dataPush = {
                        booking,
                        type: "booking_request",
                        // req_type: "broadcast",
                        generated_at: Date.now(),
                    };

                    await this.notification.send_notification(pushData, fcmSession?.fcm_token, dataPush, fcmSession?.device_type);

                    // await this.model.drivers.updateOne(
                    //     { _id: driver._id },
                    //     {
                    //         currently_send_ride_request: true,
                    //         currently_send_ride_request_id: bookingId,
                    //         currently_send_ride_request_generate_at: Date.now(),
                    //     }
                    // );

                    await this.model.booking.updateOne(
                        { _id: bookingId },
                        { $addToSet: { broadcasted_driver_ids: driver._id } }  // prevents duplicates
                    );

                    const driverData = await this.model.drivers.findById(driver._id);

                    await this.activityService.logActivity({
                        booking_id: bookingId.toString(),
                        userId: bookingId.toString(),
                        action: "BOOKING_BROADCAST",
                        resource: "booking",
                        // description: `Booking ${broadcast_type} broadcast notification - ${driverData?.name}`,
                        description: `Booking request goes to - ${driverData?.name}`,
                        payload: { driver_id: bookingId.toString() },
                    });

                } catch (err) {
                    console.error("Broadcast notification failed for driver:", driver._id);

                    // await this.activityService.logActivity({
                    //     booking_id: bookingId.toString(),
                    //     userId: driver._id,
                    //     action: "BOOKING_BROADCAST_FAIL",
                    //     resource: "booking",
                    //     description: "Broadcast notification failed",
                    //     payload: { driver_id: driver._id },
                    // });
                }
            }

        } catch (error) {
            await this.activityService.logActivity({
                booking_id: booking?._id.toString(),
                userId: booking?.driver_id,
                action: "BOOKING_BROADCAST_FAIL",
                resource: "booking",
                description: "Error in sent_broadcast_request",
                payload: { driver_id: booking?.driver_id },
            });

            console.error("Error in sent_broadcast_request:", error);
            throw error;
        }
    }

    async sent_broadcast_request_(booking) {
        try {
            console.log("booking.......", booking);

            console.log("************", booking.vehicle_id._id);

            let driversWithDistances = [];
            let driver_ids = [];
            let queryFilter = {
                vehicle_id: booking.vehicle_id._id,
                status: "active",
            };

            if (booking?.no_of_wheelchair) {
                queryFilter["wheel_chair_availabilty"] = true;
            }
            if (booking.no_of_childseat) {
                queryFilter["child_seat_availabilty"] = true;
            }
            if (booking.no_of_childcapsule) {
                queryFilter["child_capsule_availabilty"] = true;
            }
            const driversIds = await this.model.vehicle_detail.find(
                queryFilter,
                {
                    driver_id: 1,
                }
            );

            console.log("driversIds................", driversIds);

            for (const check_driver_radius of driversIds) {

                let driver_location = await this.model.drivers.findOne({
                    $and: [
                        { _id: check_driver_radius.driver_id, status: DriverStatus.Online },
                        {
                            // status: { $ne: DriverStatus.Offline },
                            // ride_status: ride_status.free,
                            is_deleted: false,
                            is_approved: true,
                            currently_send_ride_request: false,
                            doc_expiry_type: { $eq: null },
                        },
                    ],
                },
                    {
                        _id: 1,
                        status: 1,
                        is_deleted: 1,
                        is_approved: 1,
                        doc_expiry_type: 1,
                        currently_send_ride_request: 1,
                        latitude: 1,
                        longitude: 1,
                        name: 1
                    }, { lean: true });

                console.log("driver_location broadcast............", driver_location);
                let distance_in_radius =
                    await this.commonService.calculate_radius_distance(
                        booking.pickup_lat,
                        booking.pickup_long,
                        driver_location?.latitude
                            ? driver_location.latitude
                            : 0,
                        driver_location?.longitude
                            ? driver_location.longitude
                            : 0
                    );
                console.log(distance_in_radius, '<---pickup location to driver location distance_in_radius');


                if (distance_in_radius <= 50000) {
                    driversWithDistances.push({
                        driver_id: check_driver_radius.driver_id,
                        distance: distance_in_radius.toFixed(2),
                    });
                }
            }
            console.log(
                "driversWithDistances.................",
                driversWithDistances
            );

            // Sort the drivers by distance in ascending order

            driversWithDistances.sort((a, b) => a.distance - b.distance);

            // Extract and push driver IDs into the same_vehicle_driver array
            driver_ids = driversWithDistances.map((driver) => driver.driver_id);

            let key_1 = "send_booking_req_title";
            let key_2 = "send_booking_req_description";

            const send_booking_req_title =
                await this.commonService.localization("english", key_1);
            const send_booking_req_description =
                await this.commonService.localization("english", key_2);
            const cancelled_driver_ids = booking.cancelled_driver_ids
            for (const driverId of driver_ids) {

                if (!cancelled_driver_ids.some(id => id.equals(driverId))) {
                    console.log(driverId, '<------driverId to broadcast')
                    let fcm_token = await this.model.sessions.findOne({
                        user_id: driverId,
                        scope: "driver",
                    });
                    let pushData = {
                        title: send_booking_req_title["english"],
                        message: send_booking_req_description["english"],
                    };

                    let driver = await this.model.drivers.findOne({ _id: driverId });

                    let config: any = await this.model.appConfiguration.findOne();
                    let calculate_base_fee_for_driver = booking?.base_fee - (booking?.base_fee * driver?.commission / 100);
                    let airport_toll = (booking.include_airport_toll) ? config?.airport_toll : 0;
                    const amount_for_driver = calculate_base_fee_for_driver + airport_toll;
                    booking.amount_for_driver = amount_for_driver;

                    let data_push = {
                        booking: booking,
                        type: "booking_request",
                        req_type: "broadcast",
                        generated_at: Date.now(),
                    };
                    try {
                        await this.notification.send_notification(
                            pushData,
                            fcm_token?.fcm_token,
                            data_push,
                            fcm_token?.device_type
                        );

                        await this.model.drivers.updateOne({ _id: driverId }, {
                            currently_send_ride_request: true,
                            currently_send_ride_request_id: booking?._id,
                            currently_send_ride_request_generate_at: Date.now(),
                        })

                    } catch (error) {
                        console.log('<--------brodcast notification failed --------->');
                    }

                    // await this.model.drivers.updateOne({ _id: driverId }, {
                    //     currently_send_ride_request: true,
                    //     currently_send_ride_request_id: booking?._id,
                    //     currently_send_ride_request_generate_at: Date.now(),
                    // })
                }


            }
        } catch (error) {
            throw error;
        }
    }

    async sent_broadcast_request_single_driver(booking, driverId, driver, dispatcher_id) {
        try {

            let key_1 = "send_booking_req_title";
            let key_2 = "send_booking_req_description";

            const send_booking_req_title =
                await this.commonService.localization("english", key_1);
            const send_booking_req_description =
                await this.commonService.localization("english", key_2);
            const cancelled_driver_ids = booking.cancelled_driver_ids

            if (!cancelled_driver_ids.some(id => id.equals(driverId))) {
                console.log(driverId, '<------driverId to broadcast')
                let fcm_token = await this.model.sessions.findOne({
                    user_id: driverId,
                    scope: "driver",
                });
                let pushData = {
                    title: send_booking_req_title["english"],
                    message: send_booking_req_description["english"],
                };

                let config: any = await this.model.appConfiguration.findOne();
                // let calculate_base_fee_for_driver = booking?.base_fee - (booking?.base_fee * driver?.commission / 100);
                let calculate_base_fee_for_driver = booking?.amount_for_driver;
                let airport_toll = (booking.include_airport_toll) ? config?.airport_toll : 0;
                const amount_for_driver = calculate_base_fee_for_driver + airport_toll;
                booking.amount_for_driver = amount_for_driver;

                let data_push = {
                    booking: booking,
                    type: "booking_request",
                    req_type: "broadcast",
                    generated_at: Date.now(),
                };
                try {

                    // create booking Activity

                    let dispatcherData = await this.model.admin.findOne({ _id: new Types.ObjectId(dispatcher_id), email: { $ne: 'admin@gmail.com' }, roles: { $in: [StaffRoles.dispatcher] } });


                    this.activityService.logActivity({
                        booking_id: booking?._id.toString(),
                        userId: booking?.company_id,
                        action: "BOOKING_ASSIGN_DIS",
                        resource: "booking",
                        description: "Booking assigned by " + dispatcherData?.name + " to driver - " + driver?.name,
                        payload: { booking_type: booking.booking_type, driver_id: driverId }
                    });
                    // end 

                    await this.notification.send_notification(
                        pushData,
                        fcm_token?.fcm_token,
                        data_push,
                        fcm_token?.device_type
                    );
                } catch (error) {
                    console.log('<--------brodcast notification failed --------->');
                }

                await this.model.drivers.updateOne({ _id: driverId }, {
                    currently_send_ride_request: true,
                    currently_send_ride_request_id: booking?._id,
                    currently_send_ride_request_generate_at: Date.now(),
                })
            }

        } catch (error) {
            throw error;
        }
    }

    async cancel_ride_by_dispatcher(booking_id: string, payload: any) {
        try {
            const updatedBooking = await this.model.booking.findOneAndUpdate(
                { _id: booking_id },
                {
                    cancelled_by: "dispatcher",
                    booking_status: "cancelled",
                    // booking_type: "cancelled"
                },
                { new: true }
            );

            let dispatcherData = await this.model.admin.findOne({ _id: new Types.ObjectId(payload?.user_id), email: { $ne: 'admin@gmail.com' }, roles: { $in: [StaffRoles.dispatcher] } })

            // Booking Activity

            this.activityService.logActivity({
                booking_id: booking_id.toString(),
                userId: updatedBooking?.company_id,
                action: "BOOKING_CANCELLED_DIS",
                resource: "booking",
                description: "Booking Cancelled - by Dispatcher " + dispatcherData?.name,
                payload: {
                    booking_id: booking_id.toString(),
                    dispatcher_id: updatedBooking?.dispatcher_id,
                    cancelled_by: "dispatcher",
                    booking_status: "cancelled",
                    booking_type: "cancelled"
                }
            });

            // End

            // If a driver had accepted the booking, reset their state
            // if (updatedBooking?.driver_id) {
            const driverRequest = await this.model.drivers.findOne({
                $or: [
                    { currently_send_ride_request_id: booking_id },
                    { current_booking: booking_id }
                ]
            })


            // Free all drivers with this ride request
            await this.model.drivers.updateMany(
                {
                    $or: [
                        { currently_send_ride_request_id: booking_id },
                        { current_booking: booking_id }
                    ]
                },
                {
                    currently_send_ride_request: false,
                    currently_send_ride_request_id: null,
                    currently_send_ride_request_generate_at: null,
                    ride_status: ride_status.free,
                    current_booking: null
                }
            );

            await this.model.drivers.updateOne(
                { _id: updatedBooking.driver_id },
                {
                    ride_status: ride_status.free,
                    current_booking: null,
                    currently_send_ride_request: false,
                    currently_send_ride_request_id: null
                }
            );

            // Notify driver about cancellation
            const lang = driverRequest?.preferred_language ?? "english";

            const [titleMsg, descMsg] = await Promise.all([
                this.commonService.localization(lang, "cancel_request_title"),
                this.commonService.localization(lang, "cancel_request_description")
            ]);

            const sessions = await this.model.sessions.find({
                user_id: driverRequest?._id
            });

            const notifyPayload = {
                title: titleMsg[lang],
                message: descMsg[lang]
            };

            const dataPayload = {
                type: "cancel_by_dispatcher",
                booking: updatedBooking
            };

            for (const session of sessions) {
                try {
                    await this.notification.send_notification(
                        notifyPayload,
                        session.fcm_token,
                        dataPayload
                    );
                } catch (err) {
                    console.error("Notification failed:", err);
                }
            }
            // }

            return {
                message: "Booking cancelled successfully",
            };
        } catch (error) {
            console.error("Cancel ride error:", error);
            throw error;
        }
    }

    async listOfDriverForAssinByDispatcher(req: any, dto: DriverListOnDispatcherForAssignDto) {
        try {
            const { booking_id, pagination, limit, search } = dto;
            const options = await this.commonService.set_options(pagination, limit);

            const booking = await this.model.booking.findById(new Types.ObjectId(booking_id));
            const isBookingAvailable = !!booking;

            let excludedDriverIds: Types.ObjectId[] = [];
            let bookingRequirementsFilter = {};

            if (isBookingAvailable) {
                console.log("INSIDE --- listOfDriverForAssinByDispatcher booking")
                const bookingTime = moment(booking.schedule_date ?? booking.created_at);
                const fromTime = bookingTime.clone().subtract(30, 'minutes').valueOf();
                const toTime = bookingTime.clone().add(30, 'minutes').valueOf();

                const [scheduleBookings, currentBookings] = await Promise.all([
                    this.model.booking.find({
                        booking_type: BookingType.Schedule,
                        booking_status: { $nin: [BookingStatus.Cancelled, BookingStatus.Completed, BookingStatus.Failed] },
                        schedule_date: { $gte: fromTime, $lt: toTime }
                    }).select("driver_id"),
                    this.model.booking.find({
                        booking_status: { $nin: [BookingStatus.Cancelled, BookingStatus.Completed, BookingStatus.Failed] },
                        created_at: { $gte: toTime }
                    }).select("driver_id")
                ]);

                excludedDriverIds = [
                    ...scheduleBookings.map(b => new Types.ObjectId(b.driver_id)),
                    ...currentBookings.map(b => new Types.ObjectId(b.driver_id))
                ];

                bookingRequirementsFilter = await this.bookingAggregation.getBookingRequirementFilter(booking);

                console.log('bookingRequirementsFilter ---------->>', bookingRequirementsFilter)
            }

            console.log('excludedDriverIds', excludedDriverIds)

            const drivers: any = await this.model.drivers.aggregate([
                await this.bookingAggregation.lookupVehiclePricesStage(),
                { $unwind: { path: "$vehiclesprices", preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        ...(excludedDriverIds && { _id: { $nin: excludedDriverIds } }),
                        // status: DriverStatus.Online,       //comment due to point "Offline driver should get request when a dispatcher manually assigned any driver."
                        vehicle_type_id: { $ne: null },
                        is_block: false,
                        is_deleted: false,
                        is_active: true,
                        is_approved: true,
                        latitude: { $ne: null },
                        longitude: { $ne: null },
                        doc_expiry_type: null,
                        ...bookingRequirementsFilter,
                        ...(search && {
                            $or: [
                                { name: { $regex: search, $options: 'i' } },
                                { email: { $regex: search, $options: 'i' } },
                                { phone: { $regex: search, $options: 'i' } },
                            ]
                        }),
                    }
                },
                await this.bookingAggregation.lookupVehicleTypeStage(),
                { $unwind: { path: "$vehicle_types", preserveNullAndEmptyArrays: true } },
                await this.bookingAggregation.lookupVehicleDetails(),
                { $unwind: { path: "$vehicle_details", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        status: 1,
                        name: 1,
                        phone: 1,
                        country_code: 1,
                        email: 1,
                        ride_status: 1,
                        image: 1,
                        latitude: 1,
                        longitude: 1,
                        currently_send_ride_request: 1,
                        currently_send_ride_request_id: 1,
                        vehicle_detail: "$vehicle_details",
                        vehicle_types: "$vehicle_types",
                        vehicle_capacity: "$vehiclesprices",
                    },
                },
                {
                    $facet: {
                        count: [{ $count: "count" }],
                        data: [
                            {
                                $sort: {
                                    _id: -1
                                }
                            },
                            { $skip: options.skip },
                            { $limit: options.limit },
                        ]
                    }
                },
            ]);

            return {
                data: drivers?.[0]?.data || [],
                count: drivers?.[0]?.count?.[0]?.count || 0
            };

        } catch (error) {
            console.error("listOfDriverForAssinByDispatcher error:", error);
            throw error;
        }
    }

    async updatePaymentStatusDriver(booking_id: string, status: string) {
        try {
            const data = await this.model.booking.findOneAndUpdate(
                { _id: new Types.ObjectId(booking_id) },
                { pay_to_driver: status },
                { new: true }
            );

            if (data.pay_to_driver === PayToDriver.Paid) {
                await this.sendNotificationToDriverAfterPayout(data);
            }

            // Notify driver about payout
            return data
        } catch (error) {
            throw error;

        }
    }

    async sendNotificationToDriverAfterPayout(booking) {
        try {

            const sessions = await this.model.sessions.find({
                user_id: booking.driver_id
            });

            const notifyPayload = {
                title: `$${booking?.amount_for_driver} paid for the booking ${booking?.booking_id}`,
                message: `Accounts Department have been paid $${booking?.amount_for_driver} for the booking ${booking?.booking_id}. Any issues please contact Tiptop Support TEAM on 0296699390, Thank you`
            };

            const dataPayload = {
                type: "payout",
            };

            for (const session of sessions) {
                try {
                    await this.notification.send_notification(
                        notifyPayload,
                        session.fcm_token,
                        dataPayload
                    );
                } catch (err) {
                    console.error("Notification failed:", err);
                }
            }

        } catch (error) {
            throw error;
        }
    }

    async payoutsPaidUnpaidList(dto: BookingPaidUnpaidListDto) {
        try {
            const {
                status = PayToDriver.Paid, // Default to Paid if not provided
                pagination = 1,
                limit = 10,
                search = ''
            } = dto;
            let query = {
                booking_status: BookingStatus.Completed,
                pay_to_driver: status,
            };

            const options = await this.commonService.set_options(pagination, limit);

            const project = {
                booking_id: 1,
                customer_id: 1,
                driver_id: 1,
                pickup_address: 1,
                total_amount: 1,
                created_at: 1,
                pay_to_driver: 1,
                amount_for_driver : 1
            };

            const data = await this.model.booking.find(query, project, options)
                .populate("customer_id", "name email")
                .populate("driver_id", "name email")
                .populate("company_id", "name");

            const data_count = await this.model.booking.countDocuments(query);

            if (search) {
                const regex = new RegExp(search, "i");
                return {
                    data: data.filter((booking) =>
                        regex.test(booking.booking_id)
                    ),
                };
            }
            return {
                count: data_count,
                data: data,
            };
        } catch (error) {
            console.error("error", error);
            throw error;
        }
    }

    async SendMAil(body) {
        try {
            const policy_url = 'https://staging.tiptopmaxisydney.com.au/driver_policy'
            this.emailService.emailVerification(body.email, 'Tiptop Ride', body.name, body.otp, policy_url)
            // this.sent_email_booking_otp(body.name, body.otp, body.email, body.waiting_charge, body.booking_time);
        } catch (error) {

        }
    }

    async notificationTest(fcm_token, body) {
        return await this.notification.send_notification(
            body,
            fcm_token,
            'we are testing'
        );
    }
}
