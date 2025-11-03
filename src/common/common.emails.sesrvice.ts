import { MailerService } from "@nestjs-modules/mailer";

import { Injectable } from "@nestjs/common";
import * as moment from "moment";
import * as Puppeteer from "puppeteer";
import { SendGridEmailService } from "./common.sendgrid.service";
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { SendMsg91Service } from "./common.email.msg91.service";



@Injectable()
export class EmailService {
    constructor(
        private readonly mailerService: MailerService,
        private readonly sendGridEmailService: SendGridEmailService,
        private readonly sendMsg91Service: SendMsg91Service

    ) { }


    async notifyByAdmin_old(emails: [{ email: string }], title: string, description: string) {
        try {
            const emailPromises = Promise.all(emails.map((res) => {
                // this.mailerService.sendMail({
                //     to: `${res?.email}`,
                //     from: `Tiptop Ride Support <${process.env.NODEMAILER_MAIL}>`,
                //     subject: `${title}`,
                //     template: 'cloud-notification',
                //     context: {
                //         description: `${description}`
                //     }
                // })

                const subject = `${title}`;
                const email = res?.email;
                const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'cloud-notification.hbs');
                const source = fs.readFileSync(templatePath, 'utf-8');
                const compiledTemplate = handlebars.compile(source);
                const htmlBody = compiledTemplate({ description });
                return this.sendGridEmailService.sendEmailUsingSendGrid(email, subject, htmlBody,);
            }));
            console.log(emailPromises, '<----emails');
            return emailPromises
        } catch (error) {
            console.log(error, '<---from mailservice');
            throw error
        }
    }

    async notifyByAdmin(emails: { email: string }[], title: string, description: string) {
        try {
            const template_id = 'cloud_notification_3';

            const emailPromises = emails.map((res) => {
                const recipients = [
                    {
                        to: [
                            {
                                email: res.email,
                                name: res.email.split('@')[0] // or provide a real name if available
                            },
                        ],
                        variables: {
                            subject: title,
                            description: description,
                        },
                    },
                ];
                return this.sendMsg91Service.sendEmail(recipients, template_id);
            });

            const results = await Promise.all(emailPromises);
            console.log(results, '<----emails sent');
            return results;
        } catch (error) {
            console.error(error, '<---from mailservice');
            throw error;
        }
    }

    async emailVerification(email: string, product_name: string, name: string, otp: number, policy_url: string, scope = 'customer') {

        // const subject = `Your Tiptop Ride account verification code`;
        // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'email-otp.hbs');
        // const source = fs.readFileSync(templatePath, 'utf-8');
        // const compiledTemplate = handlebars.compile(source);
        // const htmlBody = compiledTemplate({
        //     name,
        //     otp,
        // });
        // return this.sendGridEmailService.sendEmailUsingSendGrid(email, subject, htmlBody,);

        let template_id = 'email_otp_21';
        let recipients = [
            {
                to: [
                    {
                        email: email,
                        name: name,
                    },
                ],
                variables: {
                    productName: product_name,
                    name: name,
                    otp: otp,
                    policyUrl: policy_url,
                },
            },
        ]
        try {
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;
        } catch (error) {
            console.error('Error sending email generatePasswordLink:', error);
            throw error
        }
    }




    async welcomeEmail(email: string, name: string, scope: string) {
        try {
            const sentFrom = (scope === 'driver') ? 'Cabby' : 'Ride';
            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'welcome-mail-customer.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({ name });
            // const subject = `Welcome to TipTop ${sentFrom}! Your Ride is Just a Tap Away 🚗`;
            // return this.sendGridEmailService.sendEmailUsingSendGrid(email, subject, htmlBody);

            let template_id = scope == 'driver' ? 'welcome_mail_driver_2' : 'welcome_mail_customer_3';
            let recipients = [
                {
                    to: [
                        {
                            email: email,
                            name: name,
                        },
                    ],
                    variables: {
                        name: name,
                    },
                },
            ]
            try {
                const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
                return response.data;
            } catch (error) {
                console.error('Error sending email generatePasswordLink:', error);
                throw error
            }

        } catch (error) {
            console.log(error, '<----from welcome emails');
            throw error
        }
    }

    async notifyAdminAboutCancellation(cancelled_reason: string, booking, driver, customer) {
        try {
            const to = 'support@tiptopmaxisydney.com.au';
            // const subject = 'Notification about ride cancellation!!';

            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'notifyAdmin.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     ORDER_ID: booking?.booking_id,
            //     CUS_NAME: customer?.name,
            //     CUS_PHONE: `${customer?.country_code} ${customer?.phone}`,
            //     PICKUP: booking?.pickup_address,
            //     DROP: booking?.drop_address,
            //     DRIVER_NAME: driver?.name,
            //     DRIVER_PHONE: `${driver?.country_code} ${driver?.phone}`,
            //     REASON: cancelled_reason,
            // });

            // await this.sendGridEmailService.sendEmailUsingSendGrid(to, subject, htmlBody);

            let template_id = 'notifyadmin';
            let recipients = [
                {
                    to: [
                        {
                            email: to,
                            name: name,
                        },
                    ],
                    variables: {
                        ORDER_ID: booking?.booking_id,
                        CUS_NAME: customer?.name,
                        CUS_PHONE: `${customer?.country_code} ${customer?.phone}`,
                        PICKUP: booking?.pickup_address,
                        DROP: booking?.drop_address,
                        DRIVER_NAME: driver?.name,
                        DRIVER_PHONE: `${driver?.country_code} ${driver?.phone}`,
                        REASON: cancelled_reason,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;

        } catch (error) {
            console.log(error, '<----from notifyAdminAboutCancellation');
            throw error
        }
    }

    async bookingOtp(email: string, name: string, date: string, booking_id: string, phone: string, pickup: string, dropoff: string, no_of_people: string, no_of_bag: number, no_of_handbag: number, no_of_childseat: number, no_of_wheelchair: number, otp?: number,
    ) {
        try {
            // const subject = 'Your Ride Booking confirmation Details!!';

            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'accept_ride_otp.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     NAME: name,
            //     DATE_TIME: date,
            //     BOOKING_ID: booking_id,
            //     EMAIL: email,
            //     PHONE: phone,
            //     PICKUP: pickup,
            //     DROPOFF: dropoff,
            //     NO_OF_PEOPLE: no_of_people,
            //     NO_OF_BAG: no_of_bag,
            //     NO_OF_HANDBAG: no_of_handbag,
            //     NO_OF_CHILDSEAT: no_of_childseat,
            //     NO_OF_WHEELCHAIR: no_of_wheelchair,
            //     OTP: otp,
            // });

            // await this.sendGridEmailService.sendEmailUsingSendGrid(email, subject, htmlBody);

            let template_id = 'accept_ride_otp_3';
            let recipients = [
                {
                    to: [
                        {
                            email: email,
                            name: name,
                        },
                        {
                            email: `bookings@tiptopride.com.au`,
                            name: `TipTop - Bookings`,
                        },
                    ],
                    variables: {
                        NAME: name,
                        DATE_TIME: date,
                        BOOKING_ID: booking_id,
                        EMAIL: email,
                        PHONE: phone,
                        PICKUP: pickup,
                        DROPOFF: dropoff,
                        NO_OF_PEOPLE: no_of_people,
                        NO_OF_BAG: no_of_bag,
                        NO_OF_HANDBAG: no_of_handbag,
                        NO_OF_CHILDSEAT: no_of_childseat,
                        NO_OF_WHEELCHAIR: no_of_wheelchair,
                        OTP: otp,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;

        } catch (error) {
            console.log(error, '<----from notifyAdminAboutCancellation');
            throw error
        }
    }

    async replyForComplaint(email: string, name: string, booking_id: string, submit_date: string,
        message: string, reply: string, title: string) {
        try {
            // const to = email;
            // const subject = `Response to Your Complaint: ${title}!!`;

            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'complaint-reply.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     customerName: name,
            //     BookingId: booking_id,
            //     submissionDate: submit_date,
            //     issueDescription: message,
            //     description: reply,
            // });

            // await this.sendGridEmailService.sendEmailUsingSendGrid(email, subject, htmlBody);

            let template_id = 'complaint_reply_3';
            let recipients = [
                {
                    to: [
                        {
                            email: email,
                            name: name,
                        },
                    ],
                    variables: {
                        customerName: name,
                        BookingId: booking_id,
                        submissionDate: submit_date,
                        issueDescription: message,
                        description: reply,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;

        } catch (error) {
            console.log(error, '<----from replyForComplaint');
            throw error
        }
    }

    async apologyForComplaint(email: string, name: string, admin_remark: string) {
        try {
            // const subject = 'Apology for Incorrect Complaint Response!!';
            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'admin-remark.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     customer_name: name,
            //     admin_message: admin_remark,
            // });
            // await this.sendGridEmailService.sendEmailUsingSendGrid(email, subject, htmlBody);

            let template_id = 'admin_remark_2';
            let recipients = [
                {
                    to: [
                        {
                            email: email,
                            name: name,
                        },
                    ],
                    variables: {
                        customer_name: name,
                        admin_message: admin_remark,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;

        } catch (error) {
            console.log(error, '<----from apologyForComplaint');
            throw error
        }
    }

    async contactUsReply(email: string, name: string, date: string, title: string, reply: string) {
        try {
            // const subject = 'Admin reply your query';

            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'contact-us.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     NAME: name,
            //     DATE: date,
            //     TITLE: title,
            //     REPLY: reply,
            // });

            // await this.sendGridEmailService.sendEmailUsingSendGrid(email, subject, htmlBody);

            let template_id = 'admin_remark_2';
            let recipients = [
                {
                    to: [
                        {
                            email: email,
                            name: name,
                        },
                    ],
                    variables: {
                        NAME: name,
                        DATE: date,
                        TITLE: title,
                        REPLY: reply,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;

        } catch (error) {
            console.log(error, '<----from apologyForComplaint');
            throw error
        }
    }

    async deactivate(email: string, name: string, text: string, status: string, scope?: string, reason?: string) {
        try {

            // const subject = `Your account Has Been ${status}`;

            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'deactivate.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     name: name,
            //     TEXT: text,
            //     REASON: reason,
            //     SCOPE: scope,
            // });

            // await this.sendGridEmailService.sendEmailUsingSendGrid(email, subject, htmlBody);

            let template_id = 'deactivate_3';
            let recipients = [
                {
                    to: [
                        {
                            email: email,
                            name: name,
                        },
                    ],
                    variables: {
                        name: name,
                        TEXT: text,
                        REASON: reason,
                        SCOPE: scope,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;

        } catch (error) {
            console.log(error, '<----from notifyAdminAboutCancellation');
            throw error
        }
    }

    async sent_payout_email(driver_detail, totalEarningAmount, numberOfTrips, total_base_fare, total_tip,
        toll_charges, total_commison_amount, total_cash_earning, pending_submit_cash, account_number
    ) {
        try {
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(today.getDate() - 1);
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            const deposite_date = new Date(today);
            deposite_date.setDate(today.getDate() + 6);

            const formattedStartDate = moment(startDate).format("DD-MM-YYYY");
            const formattedEndDate = moment(endDate).format("DD-MM-YYYY");
            const formattedDepositeDate = moment(deposite_date).format("DD-MM-YYYY");

            const subject = `Your Weekly Earnings Summary: ${formattedStartDate} to ${formattedEndDate}`;

            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'payout-template.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     driverName: driver_detail.name,
            //     totalEarnings: totalEarningAmount,
            //     numberOfTrips: numberOfTrips,
            //     rideFares: total_base_fare,
            //     tips: total_tip,
            //     tollCharges: toll_charges,
            //     commission: total_commison_amount,
            //     cashEarnings: total_cash_earning,
            //     netPayout: pending_submit_cash,
            //     depositDate: formattedDepositeDate,
            //     bankAccountNumber: account_number,
            //     startDate: formattedStartDate,
            //     endDate: formattedEndDate,
            // });

            // await this.sendGridEmailService.sendEmailUsingSendGrid(driver_detail.email, subject, htmlBody);

            let template_id = 'payout_template_2';
            let recipients = [
                {
                    to: [
                        {
                            email: driver_detail.email,
                            name: driver_detail.name,
                        },
                    ],
                    variables: {
                        driverName: driver_detail.name,
                        totalEarnings: totalEarningAmount,
                        numberOfTrips: numberOfTrips,
                        rideFares: total_base_fare,
                        tips: total_tip,
                        tollCharges: toll_charges,
                        commission: total_commison_amount,
                        cashEarnings: total_cash_earning,
                        netPayout: pending_submit_cash,
                        depositDate: formattedDepositeDate,
                        bankAccountNumber: account_number,
                        startDate: formattedStartDate,
                        endDate: formattedEndDate,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;

        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async sent_email_driver_for_pay_Commision(driver_detail, totalEarningAmount, numberOfTrips, total_base_fare,
        total_tip, toll_charges, total_commison_amount, total_cash_earning, net_payout
    ) {
        try {
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(today.getDate() - 1);
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            const deposite_date = new Date(today);
            deposite_date.setDate(today.getDate() + 6);

            const formattedStartDate = moment(startDate).format("DD-MM-YYYY");
            const formattedEndDate = moment(endDate).format("DD-MM-YYYY");
            const current = moment(endDate).add(7, "days").format("DD-MM-YYYY");

            const subject = `Your Weekly Earnings Summary: ${formattedStartDate} to ${formattedEndDate}`;

            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'pay-commision.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     driverName: driver_detail.name,
            //     totalEarnings: totalEarningAmount,
            //     numberOfTrips: numberOfTrips,
            //     rideFares: total_base_fare,
            //     tips: total_tip,
            //     tollCharges: toll_charges,
            //     commission: total_commison_amount,
            //     cashEarnings: total_cash_earning,
            //     amountDue: net_payout,
            //     todayDate: current,
            //     startDate: formattedStartDate,
            //     endDate: formattedEndDate,
            // });

            // await this.sendGridEmailService.sendEmailUsingSendGrid(driver_detail.email, subject, htmlBody);

            let template_id = 'pay_commision_2';
            let recipients = [
                {
                    to: [
                        {
                            email: driver_detail.email,
                            name: driver_detail.name,
                        },
                    ],
                    variables: {
                        driverName: driver_detail.name,
                        totalEarnings: totalEarningAmount,
                        numberOfTrips: numberOfTrips,
                        rideFares: total_base_fare,
                        tips: total_tip,
                        tollCharges: toll_charges,
                        commission: total_commison_amount,
                        cashEarnings: total_cash_earning,
                        amountDue: net_payout,
                        todayDate: current,
                        startDate: formattedStartDate,
                        endDate: formattedEndDate,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;

        } catch (error) { }
    }

    async sent_email_for_approve_docs(driver) {
        try {
            const subject = `Your Documents Are Verified – You’re Ready to Drive with TipTop Cabby! 🚗`;

            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'approve-docs.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     driverName: driver.name,
            // });

            // await this.sendGridEmailService.sendEmailUsingSendGrid(driver.email, subject, htmlBody);

            let template_id = 'approve_docs';
            let recipients = [
                {
                    to: [
                        {
                            email: driver.email,
                            name: driver.name,
                        },
                    ],
                    variables: {
                        driverName: driver.name,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;

        } catch (error) {
            throw error;
        }
    }

    async sent_email_for_reject_docs(driver, body) {
        try {
            const subject = `Important: Document Verification Unsuccessful - Account Cannot Be Activated`;

            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'reject-docs.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     driverName: driver.name,
            //     reason: body.reason,
            // });

            // await this.sendGridEmailService.sendEmailUsingSendGrid(driver.email, subject, htmlBody);

            let template_id = 'reject_docs';
            let recipients = [
                {
                    to: [
                        {
                            email: driver.email,
                            name: driver.name,
                        },
                    ],
                    variables: {
                        driverName: driver.name,
                        reason: body.reason,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async sent_docs_expire_email(data) {
        try {
            const subject = `Action Required: Your TipTop Cabby Account is Inactive Due to Expired Documents`;

            // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'docs-expired.hbs');
            // const source = fs.readFileSync(templatePath, 'utf-8');
            // const template = handlebars.compile(source);
            // const htmlBody = template({
            //     driverName: data.name,
            // });

            // await this.sendGridEmailService.sendEmailUsingSendGrid(data.email, subject, htmlBody);

            let template_id = 'docs_expired';
            let recipients = [
                {
                    to: [
                        {
                            email: data.email,
                            name: data.name,
                        },
                    ],
                    variables: {
                        driverName: data.name,
                    },
                },
            ]
            const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
            return response.data;

        } catch (error) {
            throw error;
        }
    }

    async createPdf(htmlContent) {
        try {
            const browser = await Puppeteer.launch({
                headless: true, // Optional: Run in headless mode
                args: ['--no-sandbox'],
                executablePath: '/snap/bin/chromium', // Use Puppeteer's Chromium
            });
            const page = await browser.newPage();
            await page.setContent(htmlContent);
            let pdf = await page.pdf();
            await page.goto('https://staging.easyhallbooking.com');
            await browser.close()
            // const browser = await Puppeteer.launch({
            //   headless: true,
            //   args: ['--no-sandbox']
            // })
            // const tab = await browser.newPage();
            // await tab.setContent(htmlContent);
            // let pdf = await tab.pdf();
            // await browser.close();
            return pdf
        } catch (error) {
            console.log("from creating pdf==>", error);
        }
    }

    // async sendInvoice(email: string, name: string, pdf: any) {
    //     const subject = `Invoice for your last booking`;

    //     const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'invoice.hbs');
    //     const source = fs.readFileSync(templatePath, 'utf-8');
    //     const template = handlebars.compile(source);
    //     const htmlBody = template({
    //         NAME: name,
    //     });

    //     const response = await this.sendGridEmailService.sendEmailUsingSendGrid(email, subject, htmlBody, [
    //         {
    //             filename: 'invoice.pdf',
    //             content: pdf,
    //         },
    //     ]);

    //     console.log(response, '<----mail sended');
    //     return response;
    // }

    async sendInvoice(email, name, pdf) {
        let template_id = 'invoice_7'
        let recipients = [
            {
                to: [
                    {
                        email: email,
                        name: name,
                    },
                ],
                variables: {
                    NAME: name,
                },
            },
        ]
        try {
            const response = await this.sendGridEmailService.sendEmailUsingSendGrid(email, template_id, pdf);
            return response.data;
        } catch (error) {
            console.error('Error sending email generatePasswordLink:', error);
            throw error
        }
    }

    async sendAllMshHistory(email: string, name: string, formattedChats: any) {
        const subject = 'Summery of your latest conversation with support';

        // const templatePath = path.join(process.cwd(), 'dist', 'email-template', 'support-chat.hbs');
        // const source = fs.readFileSync(templatePath, 'utf-8');
        // const template = handlebars.compile(source);
        // const htmlBody = template({
        //     NAME: name,
        //     DATA: formattedChats,
        // });

        // await this.sendGridEmailService.sendEmailUsingSendGrid(email, subject, htmlBody);

        let template_id = 'support_chat_2';
        let recipients = [
            {
                to: [
                    {
                        email: email,
                        name: name,
                    },
                ],
                variables: {
                    NAME: name,
                    DATA: formattedChats,
                },
            },
        ]
        const response = await this.sendMsg91Service.sendEmail(recipients, template_id);
        return response.data;

    }
}