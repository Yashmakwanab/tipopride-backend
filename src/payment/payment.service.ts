import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import {
    MakePaymentDto,
    PaymentType,
    Status,
} from "./dto/payment.dto";
import { DbService } from "src/db/db.service";
import { InjectStripe } from "nestjs-stripe";
import Stripe from "stripe";
import { CommonService } from "src/common/common.service";
import { AddBankDto } from "src/bank/dto/bank.dto";
import * as moment from "moment";
import * as path from "path";
import axios from "axios";
import * as fs from "fs";
import * as Handlebars from "handlebars";
import { BookingService } from "src/booking/booking.service";
import { BookingType } from "src/booking/schema/booking.schema";
import { Types } from "mongoose";
import { EarningAggregation } from "src/earning/earning.aggregation";
import { EmailService } from "src/common/common.emails.sesrvice";
import { NotificationService } from "src/notification/notification.service";
import * as momentTz from 'moment-timezone';

Handlebars;
@Injectable()
export class PaymentService {
    constructor(
        @InjectStripe() private readonly stripe: Stripe,
        private readonly model: DbService,
        private readonly commonService: CommonService,
        private readonly notification: NotificationService,
        private readonly emailService: EmailService,
        private readonly bookingService: BookingService,
        private readonly earningAggregtion: EarningAggregation,
    ) { }


    async make_payment(body: MakePaymentDto, req) {
        try {
            let language = req.headers["language"];
            const booking = await this.model.booking.findOne({
                _id: body.booking_id,
            });
            const customer = await this.model.customers.findOne({
                _id: booking.customer_id,
            });
            let current_time = moment().valueOf();
            let scheduleBooking = false;
            // Adjust the time window as needed
            let schedule_booking = await this.model.booking.findOne({
                driver_id: booking.driver_id,
                booking_type: BookingType.Schedule,
                schedule_date: {
                    // $gte: moment(current_time).subtract(15, 'minutes').valueOf(), // current time
                    $lt: moment(current_time).add(15, "minutes").valueOf(),
                },
            });

            console.log("schedule_booking.................", schedule_booking);

            if (schedule_booking) {
                // Update driver's current booking
                await this.model.drivers.updateOne(
                    { _id: schedule_booking.driver_id },
                    { current_booking: schedule_booking._id }
                );

                // Update customer's current booking
                await this.model.customers.updateOne(
                    { _id: schedule_booking.customer_id },
                    { current_booking: schedule_booking._id }
                );
                await this.model.booking.updateOne(
                    { _id: schedule_booking._id },
                    { is_ride_started: true, booking_type: BookingType.Current }
                );
                // Set scheduleBooking to true if a scheduled booking is found
                scheduleBooking = true;
            }
            if (body.payment_type == PaymentType.Cash) {
                const response = await this.payment_with_cash(
                    booking,
                    language ?? customer?.preferred_language ?? "english",
                    scheduleBooking,
                    schedule_booking
                );
                return response;
            } else if (body.payment_type == PaymentType.Card) {
                const data = {
                    amount: booking?.total_amount * 100,
                    currency: "usd",
                    customer: customer?.customer_id,
                    automatic_payment_methods: { enabled: true },
                    metadata: {
                        type: PaymentType.Card,
                        booking: body?.booking_id,
                        user_id: String(customer?._id),
                    },
                };
                const intent = await this.stripe.paymentIntents.create(data);
                return {
                    client_secret: intent?.client_secret,
                    amount: Math.round(booking?.total_amount),
                };
            } else if (body.payment_type === PaymentType.Wallet) {
                const response = await this.payment_with_wallet(
                    customer,
                    booking,
                    language
                );
                console.log("response", response);
                return response;
            } else {
                throw new HttpException(
                    { error_description: "Invalid Payment type" },
                    HttpStatus.BAD_REQUEST
                );
            }
        } catch (error) {
            console.log(error, "<----from create intent for payment");
            throw error;
        }
    }

    async Add_money_to_wallet(
        amount,
        customer_id,
        currency,
        currency_convert_amount
    ) {
        try {
            let total_add_amount = 0;
            let total_deduct_amount = 0;
            if (currency === "INR") {
                await this.model.wallet.create({
                    customer_id: customer_id,
                    amount: currency_convert_amount,
                    status: "add",
                    created_at: Date.now(),
                });
            } else if (currency === "USD") {
                await this.model.wallet.create({
                    customer_id: customer_id,
                    amount: amount,
                    status: "add",
                    created_at: Date.now(),
                });
            }
            const add_money = await this.model.wallet.find({
                customer_id: customer_id,
                status: "add",
            });
            const deduct_money = await this.model.wallet.find({
                customer_id: customer_id,
                status: "deduct",
            });
            for (const add of add_money) {
                total_add_amount += add.amount;
            }
            for (const deduct of deduct_money) {
                total_deduct_amount += deduct.amount;
            }
            const total_wallet_balance = (
                total_add_amount - total_deduct_amount
            ).toFixed(2);
            await this.model.customers.updateOne(
                { _id: customer_id },
                { wallet_balance: total_wallet_balance }
            );
            return { message: "payment completed" };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async payment_with_wallet(customer, booking, language) {
        try {
            if (customer.wallet_balance >= booking.total_amount) {
                let total_add_amount = 0;
                let total_deduct_amount = 0;
                const vehicle_prices: any = await this.model.vehicle.findOne({
                    vehicle_id: booking.vehicle_id,
                });

                await this.model.wallet.create({
                    customer_id: customer._id,
                    booking_id: booking._id,
                    amount: booking.total_amount,
                    status: "deduct",
                });

                //update customer wallet balance
                const add_money = await this.model.wallet.find({
                    customer_id: customer.id,
                    status: "add",
                });
                const deduct_money = await this.model.wallet.find({
                    customer_id: customer.id,
                    status: "deduct",
                });
                for (const add of add_money) {
                    total_add_amount += add.amount;
                }
                for (const deduct of deduct_money) {
                    total_deduct_amount += deduct.amount;
                }

                const total_wallet_balance = (
                    total_add_amount - total_deduct_amount
                ).toFixed(2);
                await this.model.customers.updateOne(
                    { _id: customer._id },
                    { wallet_balance: total_wallet_balance }
                );
                let total_amount_without_tax =
                    booking.total_amount - booking.gst;
                const admin_comission_amount =
                    (total_amount_without_tax *
                        vehicle_prices.commission_percentage) /
                    100;
                const driver_earning_amount =
                    total_amount_without_tax - admin_comission_amount;
                await this.model.driverEarnings.create({
                    customer_id: booking.customer_id,
                    driver_id: booking.driver_id,
                    booking_id: booking._id,
                    booking_amount: booking.total_amount,
                    admin_comission_amount: admin_comission_amount.toFixed(2),
                    amount: driver_earning_amount.toFixed(2),
                });

                await this.model.payments.create({
                    customer_id: customer._id,
                    driver_id: booking.driver_id,
                    amount: booking.total_amount,
                    booking_id: booking._id,
                    tax: booking.gst,
                    commision_amount: admin_comission_amount.toFixed(2),
                    payout_amount: driver_earning_amount.toFixed(2),
                    status: "completed",
                    payment_type: "wallet",
                    created_at: Date.now(),
                });
                await this.model.booking.updateOne(
                    { _id: booking._id },
                    { payment_confirmed: true }
                );
                const fcm_token = await this.model.sessions.find({
                    user_id: booking.driver_id,
                    scope: "driver",
                });

                await this.model.customers.updateOne(
                    { _id: booking.customer_id },
                    { current_booking: null }
                );
                const key1 = "payment_done_title";
                const key2 = "payment_done_description";
                const payment_done_title =
                    await this.commonService.localization(language, key1);
                const payment_done_description =
                    await this.commonService.localization(language, key2);

                for (const fcmTokens of fcm_token) {
                    let pushData = {
                        title: payment_done_title[language],
                        message: payment_done_description[language],
                    };
                    let data_push = {
                        type: "payment_done",
                    };
                    this.notification.send_notification(
                        pushData,
                        fcmTokens.fcm_token,
                        data_push
                    );
                }
                // }

                const key = "payment_completed";
                const localization = await this.commonService.localization(
                    language,
                    key
                );
                return { message: localization[language] };
            } else {
                const key1 = "insufficient_fund_title";
                const key2 = "insufficient_fund_descrpition";
                const insufficient_fund_title =
                    await this.commonService.localization(language, key1);
                const insufficient_fund_descrpition =
                    await this.commonService.localization(language, key2);
                throw new HttpException(
                    {
                        error_code: insufficient_fund_title[language],
                        error_description:
                            insufficient_fund_descrpition[language],
                    },
                    HttpStatus.BAD_REQUEST
                );
            }
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async payment_with_card(booking, customer, language) {
        try {
            const vehicle_prices: any = await this.model.vehicle.findOne({
                vehicle_id: booking.vehicle_id,
            });
            let total_amount_without_tax = booking.total_amount - booking.gst;
            const admin_comission_amount =
                (total_amount_without_tax *
                    vehicle_prices.commission_percentage) /
                100;
            const payout_amount =
                total_amount_without_tax - admin_comission_amount;
            await this.model.payments.create({
                customer_id: customer._id,
                driver_id: booking.driver_id,
                amount: booking.total_amount,
                booking_id: booking._id,
                tax: booking.gst,
                commision_amount: admin_comission_amount.toFixed(2),
                payout_amount: payout_amount.toFixed(2),
                status: "completed",
                payment_type: "card",
                created_at: Date.now(),
            });
            await this.model.driverEarnings.create({
                customer_id: booking.customer_id,
                driver_id: booking.driver_id,
                booking_id: booking._id,
                booking_amount: booking.total_amount,
                admin_comission_amount: admin_comission_amount,
                amount: payout_amount,
            });

            const key = "payment_completed";
            const localization = await this.commonService.localization(
                language,
                key
            );
            return { message: localization[language] };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async payment_with_cash(
        booking,
        language,
        scheduleBooking,
        schedule_booking
    ) {
        try {
            console.log("scheduleBooking.................", scheduleBooking);

            const vehicle_prices: any = await this.model.vehicle.findOne({
                vehicle_id: booking.vehicle_id,
            });
            let total_amount_without_tax = booking.total_amount - booking.gst;
            const admin_comission_amount = (total_amount_without_tax * vehicle_prices.commission_percentage) / 100;
            const payout_amount = total_amount_without_tax - admin_comission_amount;
            await this.model.payments.create({
                customer_id: booking.customer_id,
                driver_id: booking.driver_id,
                amount: booking.total_amount,
                booking_id: booking._id,
                tax: booking.gst,
                commision_amount: admin_comission_amount.toFixed(2),
                payout_amount: payout_amount.toFixed(2),
                status: "completed",
                payment_type: "cash",
                created_at: Date.now(),
            });
            await this.model.driverEarnings.create({
                customer_id: booking.customer_id,
                driver_id: booking.driver_id,
                booking_id: booking._id,
                amount: booking.total_amount,
            });

            await this.model.customers.findOne({ _id: booking.customer_id });
            await this.model.booking.updateOne(
                { _id: booking._id },
                { payment_confirmed: true }
            );

            const fcm_token = await this.model.sessions.find({
                user_id: booking.driver_id,
                scope: "driver",
            });
            if (scheduleBooking === true) {
                const cus_fcm_token = await this.model.sessions.find({
                    user_id: schedule_booking.customer_id,
                    scope: "customer",
                });

                for (const fcmTokens of fcm_token) {
                    let pushData = {
                        title: "Ride completed. Your next scheduled ride will start shortly",
                        message: `The payment for your completed ride has been processed successfully. Your next scheduled ride is set to start soon. Please be prepared.`,
                    };
                    let data_push = {
                        booking: schedule_booking,
                        type: "dispatcher_request",
                    };
                    this.notification.send_notification(
                        pushData,
                        fcmTokens.fcm_token,
                        data_push
                    );
                }

                for (const fcmTokens of cus_fcm_token) {
                    let pushData = {
                        title: "Get ready! Your next scheduled ride is starting soon",
                        message:
                            "Your next scheduled ride is just around the corner. Please be prepared for pickup shortly. We look forward to serving you again!",
                    };
                    let data_push = {
                        booking: schedule_booking,
                        type: "dispatcher_request",
                    };
                    this.notification.send_notification(
                        pushData,
                        fcmTokens.fcm_token,
                        data_push
                    );
                }
            } else {
                await this.model.customers.updateOne(
                    { _id: booking.customer_id },
                    { current_booking: null }
                );
                const key1 = "payment_done_title";
                const key2 = "payment_done_description";
                const payment_done_title =
                    await this.commonService.localization(language, key1);
                const payment_done_description =
                    await this.commonService.localization(language, key2);
                for (const fcmTokens of fcm_token) {
                    let pushData = {
                        title: payment_done_title[language],
                        message: payment_done_description[language],
                    };
                    let data_push = {
                        type: "payment_done",
                    };
                    this.notification.send_notification(
                        pushData,
                        fcmTokens.fcm_token,
                        data_push
                    );
                }
            }
            const key = "payment_completed";
            const localization = await this.commonService.localization(
                language,
                key
            );
            return { message: localization[language] };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async make_payment_additional(body, user) {
        try {
            let booking = await this.model.booking.findOne({
                _id: body.booking_id,
            });
            if (body.status === Status.Payment) {
                const data_to_send: any = {
                    amount: parseFloat((booking?.stop_charges * 100).toFixed(2)),
                    currency: "aud",
                    customer: user?.customer_id,
                    automatic_payment_methods: { enabled: true },
                    metadata: {
                        type: "additional_amount",
                        booking: String(booking?._id),
                    },
                };
                const intent =
                    await this.stripe.paymentIntents.create(data_to_send);


                return {
                    client_secret: intent?.client_secret,
                    amount: parseFloat((booking?.stop_charges).toFixed(2)),
                };
            } else {

                await this.model.customers.updateOne(
                    { _id: booking.customer_id },
                    { current_booking: null },
                );
                const fcm_token = await this.model.sessions.find({
                    user_id: booking.driver_id,
                    scope: 'driver',
                });

                console.log("fcm_token................", fcm_token);

                let pushData;
                for (const fcmTokens of fcm_token) {
                    console.log(" fcmTokens.fcm_token....................", fcmTokens.fcm_token);

                    pushData = {
                        title: "Ride Completed",
                        message: "Your ride has been successfully completed. Thank you for choosing our service!",
                    };

                    let data_push = {
                        type: 'payment_done',
                    };
                    this.notification.send_notification(
                        pushData,
                        fcmTokens.fcm_token,
                        data_push,
                    );
                }
                await this.model.booking.updateOne(
                    { _id: booking._id },
                    { payment_confirmed: true }
                );
                await this.model.customers.updateOne(
                    { _id: booking.customer_id },
                    {
                        pending_pay_amount: booking?.stop_charges || 0,
                        current_booking: null,
                    }
                );

                return { message: "booking successfully completed" }
            }
        } catch (error) {
            throw error;
        }
    }

    async addBank(body: AddBankDto, name: string, currency) {
        try {
            return await this.stripe.tokens.create({
                bank_account: {
                    country: body.country,
                    currency: currency,
                    account_holder_name: name,
                    account_holder_type: "individual",
                    routing_number: body.bsb_number,
                    account_number: body.account_number,
                },
            });
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async uploadStripeDoc(file_url: any) {
        var buffer = await axios.get(file_url, { responseType: "arraybuffer" });
        var file = await this.stripe.files.create({
            purpose: "identity_document",
            file: {
                data: buffer.data,
                name: file_url,
                type: "application/octet-stream",
            },
        });
        return file;
    }

    async AddAccount(
        body: AddBankDto,
        bank_token_id: string,
        user: any,
        driver_customer_id,
        file_id
    ) {
        try {
            // let payload1: any = {
            //     type: "custom",
            //     country: body.country,
            //     email: user.email || user.temp_email,
            //     capabilities: {
            //         card_payments: { requested: true },
            //         transfers: { requested: true },
            //     },
            //     business_type: "individual",
            //     individual: {
            //         id_number: body.ssn_last4_number,
            //         address: {
            //             city: body?.address?.city || user?.address?.city,
            //             country: body?.country || user?.address?.country,
            //             postal_code:
            //                 body?.address?.postal_code ||
            //                 user?.address?.postal_code,
            //             line1: body?.address?.line1 || user?.address?.line1,
            //             state: body?.address?.state || user?.address?.state,
            //         },
            //         email: user?.email,
            //         phone:
            //             `${body?.country_code}${body?.phone}` ||
            //             `${user?.country_code}${user?.phone}`,
            //         first_name: body.first_name || user?.name,
            //         last_name: body.last_name,
            //         dob: {
            //             day: moment(
            //                 body?.date_of_birth || user?.date_of_birth
            //             ).format("DD"),
            //             month: moment(
            //                 body?.date_of_birth || user?.date_of_birth
            //             ).format("MM"),
            //             year: moment(
            //                 body?.date_of_birth || user?.date_of_birth
            //             ).format("YYYY"),
            //         },
            //         verification: {
            //             document: {
            //                 front: file_id || "file_1OVDMwFfj22JfyvLVALrdvrO",
            //             },
            //         },
            //     },
            //     metadata: {
            //         customer_id: driver_customer_id,
            //     },
            //     business_profile: {
            //         url: "https://staging.nearmerv.com",
            //         name: `${body?.first_name}`,
            //         support_email: user?.email || user?.temp_email,
            //         mcc: "5734",
            //     },
            //     company: {
            //         name: `${user.name}`,
            //         tax_id: "123456789",
            //     },
            //     external_account: bank_token_id,
            //     tos_acceptance: {
            //         date: Math.floor(moment().valueOf() / 1000),
            //         ip: "192.168.1.41",
            //     },
            // };
            let payload1: any = {
                type: "custom",
                country: "AU",
                email: user.email || user.temp_email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: "individual",
                individual: {
                    // For Australia, you should use tax_id and specify the type
                    id_number: body.tax_file_number, // Australian Tax File Number

                    address: {
                        city: body?.address?.city || user?.address?.city,
                        country: "AU", // Ensure this is "AU"
                        postal_code: body?.address?.postal_code || user?.address?.postal_code,
                        line1: body?.address?.line1 || user?.address?.line1,
                        state: body?.address?.state || user?.address?.state, // Make sure this is an Australian state code (NSW, VIC, etc.)
                    },
                    email: user?.email,
                    phone: `${body?.country_code}${body?.phone}` || `${user?.country_code}${user?.phone}`,
                    first_name: body.first_name || user?.name,
                    last_name: body.last_name,
                    dob: {
                        day: moment(body?.date_of_birth || user?.date_of_birth).format("DD"),
                        month: moment(body?.date_of_birth || user?.date_of_birth).format("MM"),
                        year: moment(body?.date_of_birth || user?.date_of_birth).format("YYYY"),
                    },
                    verification: {
                        document: {
                            front: file_id || "file_1OVDMwFfj22JfyvLVALrdvrO",
                        },
                    },
                },
                metadata: {
                    customer_id: driver_customer_id,
                },
                business_profile: {
                    url: "https://staging.nearmerv.com",
                    name: `${body?.first_name}`,
                    support_email: user?.email || user?.temp_email,
                    mcc: "5734", // Double-check if this MCC is appropriate for your business in Australia
                },
                company: {
                    name: `${user.name}`,
                    tax_id: "123456789", // Should be ABN for Australian businesses
                },
                external_account: bank_token_id,
                tos_acceptance: {
                    date: Math.floor(moment().valueOf() / 1000),
                    ip: "192.168.1.41",
                },
            };
            return await this.stripe.accounts.create(payload1);
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async uploadDoc(file) {
        try {
            file = process.env.Url + "/" + process.env.FOLDER + "/" + file;
            var buffer = await axios.get(file, { responseType: "arraybuffer" });
            return await this.stripe.files.create({
                purpose: "identity_document",
                file: {
                    data: buffer?.data,
                    name: file,
                    type: "application/octet-stream",
                },
            });
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    async transferMoneyToDriver(amount, destination) {
        try {
            let amountInCents = Math.round(amount * 100);
            let createPayout = await this.stripe.transfers.create({
                amount: amountInCents,
                currency: "aud",
                destination: destination,
                transfer_group: "CAB_95",
            });
            if (createPayout) {
                return createPayout;
            }
            return false;
        } catch (error) {
            throw error;
        }
    }

    async transferMoney() {
        try {
            const startOfDay = moment().valueOf();
            const drivers_to_pay = await this.model.drivers.find({ is_approved: true })
            await Promise.all(drivers_to_pay.map(async (res) => {
                const bank = await this.model.banks.findOne({ driver_id: res?._id });
                if (!bank) {
                    // send email to add bank 
                    return
                }
                const pipeline = await this.earningAggregtion.payountCalculation(res?._id, startOfDay)
                const data: any = await this.model.booking.aggregate(pipeline)
                let payout = null
                try {
                    payout = this.stripe.transfers.create({
                        amount: data[0]?.driver_earning > data[0]?.total_invoice_amount ? data[0]?.driver_earning - data[0]?.total_invoice_amount : data[0]?.driver_earning,
                        destination: bank?.account_id,
                        currency: 'aud'
                    })
                } catch (error) {
                    console.log(error);
                }
                await this.model.payments.updateMany({ booking_id: { $in: data[0].booking_ids } },
                    { payout_to_driver: 'completed', payout_initiated: +new Date(), payout_id: payout?.id, driver_id: res?._id }
                )
                await this.model.booking.updateMany({ _id: { $in: data[0].booking_ids } },
                    { is_satteled: true }
                )
                return
            }))
        } catch (error) {
            console.error("Error:", error);
            throw error;
        }
    }

    // async sent_payout_email(
    //     payment_data,
    //     driver_detail,
    //     totalEarningAmount,
    //     numberOfTrips,
    //     total_base_fare,
    //     total_tip,
    //     toll_charges,
    //     total_commison_amount,
    //     total_cash_earning,
    //     pending_submit_cash,
    //     account_number
    // ) {
    //     try {
    //         const today = new Date();
    //         const endDate = new Date(today);
    //         endDate.setDate(today.getDate() - 1);
    //         const startDate = new Date(today);
    //         startDate.setDate(today.getDate() - 7);
    //         const deposite_date = new Date(today);
    //         deposite_date.setDate(today.getDate() + 6);
    //         const formattedStartDate = moment(startDate).format("DD-MM-YYYY");
    //         const formattedEndDate = moment(endDate).format("DD-MM-YYYY");
    //         const formattedDepositeDate =
    //             moment(deposite_date).format("DD-MM-YYYY");
    //         const currentDir = __dirname;
    //         const cabAppDir = path.resolve(currentDir, "../../"); // Moves up two levels from dist/payment
    //         console.log("hello", cabAppDir);

    //         let file_path = path.join(
    //             __dirname,
    //             "../../dist/email-template/payout-template.hbs"
    //         );
    //         console.log("hello1");
    //         console.log("file_path", file_path);
    //         let html = fs.readFileSync(file_path, { encoding: "utf-8" });

    //         // Compile the template
    //         const template = Handlebars.compile(html);

    //         // Create the data object
    //         const data = {
    //             driverName: driver_detail.name,
    //             totalEarnings: totalEarningAmount,
    //             numberOfTrips: numberOfTrips,
    //             rideFares: total_base_fare,
    //             tips: total_tip,
    //             tollCharges: toll_charges,
    //             commission: total_commison_amount,
    //             cashEarnings: total_cash_earning,
    //             netPayout: pending_submit_cash,
    //             depositDate: formattedDepositeDate,
    //             bankAccountNumber: account_number,
    //             startDate: formattedStartDate,
    //             endDate: formattedEndDate,
    //         };

    //         // Generate the HTML with the data
    //         const htmlToSend = template(data);

    //         console.log("hello2");
    //         const mailData = {
    //             to: driver_detail.email,
    //             subject: `Your Weekly Earnings Summary: ${formattedStartDate} to ${formattedEndDate}`,
    //             html: htmlToSend,
    //         };

    //         // Send an email with the response
    //         const mail = await this.commonService.sendmail(
    //             mailData.to,
    //             mailData.subject,
    //             null,
    //             mailData.html
    //         );
    //     } catch (error) {
    //         console.log("error", error);
    //         throw error;
    //     }
    // }

    // async sent_email_driver_for_pay_Commision(
    //     driver_detail,
    //     totalEarningAmount,
    //     numberOfTrips,
    //     total_base_fare,
    //     total_tip,
    //     toll_charges,
    //     total_commison_amount,
    //     total_cash_earning,
    //     net_payout
    // ) {
    //     try {
    //         const today = new Date();
    //         const endDate = new Date(today);
    //         endDate.setDate(today.getDate() - 1);
    //         const startDate = new Date(today);
    //         startDate.setDate(today.getDate() - 7);
    //         const deposite_date = new Date(today);
    //         deposite_date.setDate(today.getDate() + 6);
    //         const formattedStartDate = moment(startDate).format("DD-MM-YYYY");
    //         const formattedEndDate = moment(endDate).format("DD-MM-YYYY");
    //         const current = moment(endDate)
    //             .add("7", "days")
    //             .format("DD-MM-YYYY");
    //         const currentDir = __dirname;
    //         const cabAppDir = path.resolve(currentDir, "../../");
    //         console.log("hello", cabAppDir);

    //         let file_path = path.join(
    //             __dirname,
    //             "../../dist/email-template/pay-commision.hbs"
    //         );

    //         console.log("file_path", file_path);
    //         let html = fs.readFileSync(file_path, { encoding: "utf-8" });

    //         // Compile the template
    //         const template = Handlebars.compile(html);
    //         const data = {
    //             driverName: driver_detail.name,
    //             totalEarnings: totalEarningAmount,
    //             numberOfTrips: numberOfTrips,
    //             rideFares: total_base_fare,
    //             tips: total_tip,
    //             tollCharges: toll_charges,
    //             commission: total_commison_amount,
    //             cashEarnings: total_cash_earning,
    //             amountDue: net_payout,
    //             todayDate: current,
    //             startDate: formattedStartDate,
    //             endDate: formattedEndDate,
    //         };
    //         const htmlToSend = template(data);

    //         console.log("hello2");
    //         const mailData = {
    //             to: driver_detail.email,
    //             subject: `Your Weekly Earnings Summary: ${formattedStartDate} to ${formattedEndDate}`,
    //             html: htmlToSend,
    //         };

    //         // Send an email with the response
    //         const mail = await this.commonService.sendmail(
    //             mailData.to,
    //             mailData.subject,
    //             null,
    //             mailData.html
    //         );
    //     } catch (error) { }
    // }

    async checkStripeBalance() {
        try {
            const balance = await this.stripe.balance.retrieve();
            console.log(balance);

            console.log("balance...", balance.available[0].amount);
            let amount = parseFloat(
                (balance.instant_available[0].amount / 100).toFixed(2)
            );
            return amount;
        } catch (error) {
            console.error("Error retrieving balance:", error);
        }
    }

    async driverPendingPaymentUpdate(driver_id, week_start, week_end) {
        try {
            console.log("driverpendingPayment...............");

            const data = await this.model.payments.find({
                driver_id: driver_id,
                created_at: {
                    $gte: week_start,
                    $lte: week_end,
                },
            });
            await this.model.drivers.updateOne(
                { _id: driver_id },
                { pending_submit_cash: 0, pending_submit_cash_upated_at: null }
            );
            for (const payment_data of data) {
                console.log(
                    "driverpendingPayment...............",
                    payment_data
                );
                await this.model.payments.updateOne(
                    { _id: payment_data._id },
                    {
                        pending_amount_pay_on: Date.now(),
                        pending_amount_status: "no_due",
                    }
                );
            }
            return { message: "payment succesfully completed" };
        } catch (error) {
            throw error;
        }
    }
    async webhook(headers, body) {
        try {
            console.log("<webhook--------called");

            body = JSON.stringify(body, null, 2);
            const secret = process.env.STRIPE_WEBHOOK;
            const header = await this.stripe.webhooks.generateTestHeaderString({
                payload: body,
                secret,
            });
            const event = this.stripe.webhooks.constructEvent(
                body,
                header,
                secret
            );
            console.log(event, "<webhook--------event");

            switch (event.type) {
                case "payment_intent.payment_failed":
                    const paymentIntentPaymentFailed = event.data.object;
                    console.log(
                        paymentIntentPaymentFailed,
                        "<--------paymentIntentPaymentFailed"
                    );
                    // Then define and call a function to handle the event payment_intent.payment_failed
                    break;
                case "payment_intent.succeeded":
                    console.log("payment_intent.succeeded--webhook called");
                    const paymentIntentSucceeded = event.data.object;
                    console.log('INNNNNNNNNNNNNSSSSSSSSSSSSSSSSSIIIIIIIIIIIIIDDDDDDDDEEEEEE--------------------------------', paymentIntentSucceeded)
                    const intentId = paymentIntentSucceeded?.id;
                    if (paymentIntentSucceeded?.metadata?.type === "additional_amount") {
                        const booking = await this.model.booking.findById({
                            _id: new Types.ObjectId(
                                paymentIntentSucceeded?.metadata?.booking
                            ),
                        });
                        let current_time = moment().valueOf();
                        let scheduleBooking = false;

                        let schedule_booking = await this.model.booking.findOne({
                            driver_id: booking.driver_id,
                            booking_type: BookingType.Schedule,
                            schedule_date: {
                                // $gte: moment(current_time).subtract(15, 'minutes').valueOf(), // current time
                                $lt: moment(current_time).add(15, 'minutes').valueOf(),
                            },
                        });

                        const customer = await this.model.customers.findOne({
                            _id: booking.customer_id,
                        });
                        if (schedule_booking) {
                            // Update driver's current booking
                            await this.model.drivers.updateOne(
                                { _id: schedule_booking.driver_id },
                                { current_booking: schedule_booking._id },
                            );

                            // Update customer's current booking
                            await this.model.customers.updateOne(
                                { _id: schedule_booking.customer_id },
                                { current_booking: schedule_booking._id },
                            );
                            await this.model.booking.updateOne(
                                { _id: schedule_booking._id },
                                { is_ride_started: true, booking_type: BookingType.Current },
                            );
                            // Set scheduleBooking to true if a scheduled booking is found
                            scheduleBooking = true;
                        }

                        await this.sendNotiAfterAdditionalPayment(
                            body,
                            booking,
                            customer,
                            customer.preferred_language ?? 'english',
                            scheduleBooking,
                            schedule_booking,
                        );

                        await this.model.booking.updateOne(
                            { _id: booking._id },
                            { payment_confirmed: true }
                        );

                        await this.model.customers.updateOne(
                            { _id: booking.customer_id },
                            { current_booking: null }
                        );

                        booking.stop_charges;
                        await this.model.payments.updateOne({
                            booking_id: new Types.ObjectId(
                                paymentIntentSucceeded?.metadata?.booking
                            ),
                        });

                        const vehicle_prices: any =
                            await this.model.vehicle.findOne({
                                vehicle_id: booking.vehicle_id,
                            });
                        let total_amount_without_tax =
                            booking.total_amount - booking.gst;
                        const admin_comission_amount =
                            (total_amount_without_tax *
                                vehicle_prices.commission_percentage) /
                            100;
                        const payout_amount =
                            total_amount_without_tax - admin_comission_amount;
                        await this.model.payments.updateOne(
                            {
                                booking_id: new Types.ObjectId(
                                    paymentIntentSucceeded?.metadata?.booking
                                ),
                            },
                            {
                                driver_id: booking.driver_id,
                                amount: booking.total_amount,
                                commision_amount:
                                    admin_comission_amount.toFixed(2),
                                payout_amount: payout_amount.toFixed(2),
                            }
                        );
                        await this.model.driverEarnings.updateOne(
                            {
                                booking_id: new Types.ObjectId(
                                    paymentIntentSucceeded?.metadata?.booking
                                ),
                            },
                            {
                                booking_amount: booking.total_amount,
                                admin_comission_amount: admin_comission_amount,
                                amount: payout_amount,
                            }
                        );
                    } else if (paymentIntentSucceeded?.metadata?.booking_type === "create") {
                        console.log('<---------------webhook called------------->');


                        console.log('JSON.stringify(paymentIntentSucceeded?.metadata)', JSON.stringify(paymentIntentSucceeded?.metadata))

                        let booking = await this.model.booking.findOne({
                            _id: paymentIntentSucceeded?.metadata?.booking_id,
                        });

                        if (booking) {
                            await this.model.booking.updateOne(
                                { _id: booking._id },
                                { intent_id: intentId, payment_success: true }
                            );
                            const customer = await this.model.customers.findOneAndUpdate(
                                {
                                    _id: booking.customer_id,
                                },
                                {
                                    current_booking: booking._id,
                                    pending_pay_amount: 0,
                                }, { new: true }
                            );
                            await this.payment_with_card(
                                booking,
                                customer,
                                customer.preferred_language ?? "english"
                            );

                            //<<<<<<<< SEND PUSH TO NEAREST DRIVERS >>>>>>>>>>>
                            await this.bookingService.send_push_to_nearest_drivers(
                                booking,
                                booking.customer_id
                            );
                        }
                    } else if (paymentIntentSucceeded?.metadata?.booking_type === "current") {
                        console.log('<---------------webhook called-------------> current ###########');


                        console.log('JSON.stringify(paymentIntentSucceeded?.metadata)', JSON.stringify(paymentIntentSucceeded?.metadata))

                        let booking = await this.model.booking.findOne({
                            _id: paymentIntentSucceeded?.metadata?.booking_id,
                        });

                        if (booking) {
                            await this.model.booking.updateOne(
                                { _id: booking._id },
                                { intent_id: intentId, payment_success: true }
                            );
                            const customer = await this.model.customers.findOneAndUpdate(
                                {
                                    _id: booking.customer_id,
                                },
                                {
                                    current_booking: booking._id,
                                    pending_pay_amount: 0,
                                }, { new: true }
                            );
                            await this.payment_with_card(
                                booking,
                                customer,
                                customer.preferred_language ?? "english"
                            );

                            //<<<<<<<< SEND PUSH TO NEAREST DRIVERS >>>>>>>>>>>
                            await this.bookingService.send_push_to_nearest_drivers(
                                booking,
                                booking.customer_id
                            );
                        }
                    } else if (paymentIntentSucceeded?.metadata?.booking_type === "schedule_booking") {
                        console.log('<----scheduled booking paid----->');
                        console.log(paymentIntentSucceeded?.metadata?.booking_id, '<----booking_id----->');
                        let booking = await this.model.booking.findOne({
                            _id: paymentIntentSucceeded?.metadata?.booking_id,
                        });

                        if (booking) {
                            const customer = await this.model.customers.findOne({ _id: booking.customer_id, });
                            if (paymentIntentSucceeded?.metadata?.booking_from === "web") {
                                console.log(`******booking found and sending mail----->`);

                                // const booking_time = moment(booking?.schedule_date).add(5, 'hour').add(30, 'minute').format('DD MMM YYYY hh:mm A')
                                const booking_time = momentTz(booking?.schedule_date).tz(process.env.APP_TIMEZONE || 'Australia/Sydney').format('DD MMM YYYY hh:mm A')
                               var mailResp = this.emailService.bookingOtp(
                                    paymentIntentSucceeded?.metadata?.email,
                                    paymentIntentSucceeded?.metadata?.name,
                                    booking_time,
                                    booking?.booking_id,
                                    `${customer?.temp_country_code ?? customer?.country_code} ${customer?.temp_phone ?? customer?.phone}`,
                                    booking?.pickup_address,
                                    booking?.drop_address,
                                    String(booking?.passenger),
                                    booking?.luggage,
                                    booking?.handbags,
                                    booking?.child_seat_charge ? 1 : 0,
                                    booking?.wheel_chair_charge ? 1 : 0,
                                    + paymentIntentSucceeded?.metadata?.otp,
                                );

                                console.log(" mailResp -",mailResp);
                            }
                            await this.model.booking.updateOne(
                                { _id: booking._id },
                                { intent_id: intentId, payment_success: true }
                            );
                            await this.payment_with_card(
                                booking,
                                customer,
                                customer.preferred_language ?? "english"
                            );
                            const payload = {
                                title: `New Ride Request!`,
                                message: `A new ride request is available.`
                            }
                            const isCatch = false
                            if (booking.booking_type === BookingType.Schedule) {
                                await this.bookingService.notifyDispatcher(payload, isCatch)
                            }
                        }
                        break;
                    }

                    break;
                // ... handle other event types
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async sendNotiAfterAdditionalPayment(
        body,
        booking,
        customer,
        language,
        scheduleBooking,
        schedule_booking,) {
        try {
            const fcm_token = await this.model.sessions.find({
                user_id: booking.driver_id,
                scope: 'driver',
            });

            if (scheduleBooking === true) {
                const cus_fcm_token = await this.model.sessions.find({
                    user_id: schedule_booking.customer_id,
                    scope: "customer",
                });

                for (const fcmTokens of fcm_token) {
                    let pushData = {
                        title: "Ride completed. Your next scheduled ride will start shortly",
                        message: `The payment for your completed ride has been processed successfully. Your next scheduled ride is set to start soon. Please be prepared.`,
                    };
                    let data_push = {
                        booking: schedule_booking,
                        type: "dispatcher_request",
                    };
                    this.notification.send_notification(
                        pushData,
                        fcmTokens.fcm_token,
                        data_push
                    );
                }

                for (const fcmTokens of cus_fcm_token) {
                    let pushData = {
                        title: "Get ready! Your next scheduled ride is starting soon",
                        message:
                            "Your next scheduled ride is just around the corner. Please be prepared for pickup shortly. We look forward to serving you again!",
                    };
                    let data_push = {
                        booking: schedule_booking,
                        type: "dispatcher_request",
                    };
                    this.notification.send_notification(
                        pushData,
                        fcmTokens.fcm_token,
                        data_push
                    );
                }
            } else {
                await this.model.customers.updateOne(
                    { _id: booking.customer_id },
                    { current_booking: null }
                );
                const key1 = "payment_done_title";
                const key2 = "payment_done_description";
                const payment_done_title =
                    await this.commonService.localization(language, key1);
                const payment_done_description =
                    await this.commonService.localization(language, key2);
                let pushData;
                for (const fcmTokens of fcm_token) {
                    pushData = {
                        title: payment_done_title[language],
                        message: payment_done_description[language],
                    };

                    let data_push = {
                        type: "payment_done",
                    };
                    this.notification.send_notification(
                        pushData,
                        fcmTokens.fcm_token,
                        data_push
                    );
                }
            }
        } catch (error) {
            throw error;
        }
    }
}