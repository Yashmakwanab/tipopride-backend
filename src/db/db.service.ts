import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Customers } from 'src/customer/schema/customer.schema';
import { Model } from "mongoose";
import { Sessions } from 'src/customer/schema/session.schema';
import { Drivers } from 'src/driver/schema/driver.schema';
import { VehiclesPrices } from 'src/vehicle/schema/vehicle.schema';

import { Coupons } from 'src/coupon/schema/coupon.schema';
import { Admin } from 'src/admin/schema/admin.schema';
import { Vehicle_details } from 'src/driver/schema/vehicle-detail.schema';
import { DocumentsDetails } from 'src/driver/schema/documents-details.schema';
import { Customer_Address } from 'src/customer/schema/customer.address.schema';
import { Booking } from 'src/booking/schema/booking.schema';
import { Booking_notifications } from 'src/booking/schema/booking-notification.schema';
import { Declined_bookings } from 'src/booking/schema/declined-bookings.schema';
import { Reviews } from 'src/review/schema/reviews.schema';
import { DriverEarnings } from 'src/earning/schema/driver-earnings.schema';
import { Chats } from 'src/chat/schema/chat.schema';
import { Connections } from 'src/chat/schema/connection.schema';
import { Payments } from 'src/payment/schema/payment.schema';
import { Cards } from 'src/card/schema/cards.schema';
import { Wallets } from 'src/wallet/schema/wallet.schema';
import { Banks } from 'src/bank/schema/bank.schema';
import { Languages } from 'src/admin/schema/language.schema';
import { SurchargeDates } from 'src/surcharge/schema/surcharge-dates.schema';
import { Vehicle_types } from 'src/vehicle/schema/vehicle-type.schema';
import { Complaints } from 'src/complaint/schema/complaint.schema';
import { Contactus } from 'src/contactus/schema/contactus.schema';
import { Faqs } from 'src/faq/schema/faq.schema';
import { Pages } from 'src/content-page/schema/page.schema';
import { AppConfiguration } from 'src/configuration/schema/app-configuration.schema';
import { DocsUpdateHistory } from 'src/driver/schema/docs-update-history';
import { Tax } from 'src/payment/schema/tax.schema';
import { SurchargeHistory } from 'src/surcharge/schema/surcharge-history.schema';
import { Company } from 'src/company/schema/company.schema';
import { DriverPayoutHistory } from 'src/driver/schema/driver-payout-history.schema';
import { config } from 'dotenv';
import * as moment from 'moment';
import * as fs from 'fs'
import * as path from 'path';
import { exec } from 'child_process';
import * as mime from 'mime-types';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { Notification } from 'src/notification/schema/notification.schema';

@Injectable()
export class DbService {
    private s3: AWS.S3;
    private readonly bucketName: string;
    private readonly base_url: string;
    private readonly db_uri: string;

    constructor(
        @InjectModel(Customers.name) public customers: Model<Customers>,
        @InjectModel(Sessions.name) public sessions: Model<Sessions>,
        @InjectModel(Drivers.name) public drivers: Model<Drivers>,
        @InjectModel(VehiclesPrices.name) public vehicle: Model<VehiclesPrices>,
        @InjectModel(Vehicle_types.name) public vehicleType: Model<Vehicle_types>,
        @InjectModel(Coupons.name) public coupons: Model<Coupons>,
        @InjectModel(Admin.name) public admin: Model<Admin>,
        @InjectModel(Vehicle_details.name) public vehicle_detail: Model<Vehicle_details>,
        @InjectModel(DocumentsDetails.name) public documentsDetails: Model<DocumentsDetails>,
        @InjectModel(Customer_Address.name) public customerAddress: Model<Customer_Address>,
        @InjectModel(Booking.name) public booking: Model<Booking>,
        @InjectModel(Booking_notifications.name) public booking_notifications: Model<Booking_notifications>,
        @InjectModel(Declined_bookings.name) public declined_bookings: Model<Declined_bookings>,
        @InjectModel(Reviews.name) public reviews: Model<Reviews>,
        @InjectModel(DriverEarnings.name) public driverEarnings: Model<DriverEarnings>,
        @InjectModel(Chats.name) public chats: Model<Chats>,
        @InjectModel(Connections.name) public connections: Model<Connections>,
        @InjectModel(Payments.name) public payments: Model<Payments>,
        @InjectModel(Cards.name) public cards: Model<Cards>,
        @InjectModel(Wallets.name) public wallet: Model<Wallets>,
        @InjectModel(Banks.name) public banks: Model<Banks>,
        @InjectModel(Languages.name) public language: Model<Languages>,
        @InjectModel(SurchargeDates.name) public surchargeDates: Model<SurchargeDates>,
        @InjectModel(Complaints.name) public complaints: Model<Complaints>,
        @InjectModel(Contactus.name) public contactus: Model<Contactus>,
        @InjectModel(Faqs.name) public faqs: Model<Faqs>,
        @InjectModel(Pages.name) public pages: Model<Pages>,
        @InjectModel(AppConfiguration.name) public appConfiguration: Model<AppConfiguration>,
        @InjectModel(DocsUpdateHistory.name) public docsUpdateHistory: Model<DocsUpdateHistory>,
        @InjectModel(Tax.name) public tax: Model<Tax>,
        @InjectModel(SurchargeHistory.name) public surchargeHistory: Model<SurchargeHistory>,
        @InjectModel(Company.name) public company: Model<Company>,
        @InjectModel(DriverPayoutHistory.name) public driverPayoutHistory: Model<DriverPayoutHistory>,
        @InjectModel(Notification.name) public notification: Model<Notification>,
        private readonly configService: ConfigService,
    ) {
        this.base_url = this.configService.get<string>('Url');
        const doSpacesEndpoint = this.configService.get<string>('DO_ENDPOINT')
        const spaceEndpoint = new AWS.Endpoint(doSpacesEndpoint);
        this.s3 = new AWS.S3({
            accessKeyId: this.configService.get<string>('DO_ACCESS_KEY'),
            secretAccessKey: this.configService.get<string>('DO_SECRET_ACCESS_KEY'),
            endpoint: spaceEndpoint,
        });
        this.bucketName = this.configService.get<string>('BUCKET_NAME');
        this.db_uri = this.configService.get<string>('DB_URL');
    }

    async create_backup(backup_name: string, gzip: boolean) {
        try {

            let dump_path: any;
            if (process.env.ENVIORNMENT == "LOCAL") { 
                dump_path = path.resolve(__dirname, `./../db_backups/${backup_name}`)
            }
            else {
                dump_path = path.resolve(__dirname, `./../db_backups/${backup_name}`)
            }
            let command = `mongodump --uri="${this.db_uri}" ${gzip ? " --gzip" : ""} --archive="${dump_path}"`;
            let gen_backup_file = await this.exexute_backup_command(command)
            return gen_backup_file
        }
        catch (err) {
            throw err
        }
    }

    async exexute_backup_command(command: string) {
        return new Promise((resolve, reject) => {
            try {
                exec(command, (err) => {
                    if (err) { console.error("uploading error-..--..", err) }
                    else {
                        let message = "BACKUP_CREATED"
                        return resolve(message);
                    }
                });
            }
            catch (err) {
                throw err;
            }
        });
    }

    // if backup count is less than 10
    async backup_case_1() {
        try {
            let fetch_data: any = await this.gen_backup_name()

            let { name } = fetch_data
            let file_name = `${name}.gz`

            let gen_backup = await this.create_backup(file_name, true)

            if (gen_backup == 'BACKUP_CREATED') {
                let fetch_file = path.resolve(__dirname, `./../db_backups/${file_name}`)
                // check file type
                let mime_type = await mime.lookup(fetch_file)
                // read file
                let read_file = fs.readFileSync(fetch_file);

                let params = {
                    Bucket: this.bucketName,
                    Key: `backup/${file_name}`,
                    Body: read_file,
                    ContentType: mime_type
                }
                let upload_file: any = await this.upload_file_to_spaces(params)

                let { Location, Key } = upload_file

                fs.unlinkSync(fetch_file)

                const paramsToGetObject = {
                    Bucket: this.bucketName,
                    Key: Key,
                    Expires: 3600, // URL expiration time in seconds (e.g., 1 hour)
                };
                const url = this.s3.getSignedUrl('getObject', paramsToGetObject);

                return url;
            }
            else {
                throw new HttpException("BACKUP_UPLOAD_FAILED", HttpStatus.BAD_REQUEST)
            }
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }

    async gen_backup_name() {
        try {
            let current_millis = moment().format('x')
            let static_name = process.env.DB_NAME || 'tipTop_db_backup'
            let name = `${static_name}_${current_millis}`
            return {
                name: name,
                unique_key: current_millis
            }
        }
        catch (err) {
            console.log(err);

            throw err;
        }
    }
    async upload_file_to_spaces(params: any) {
        return new Promise((resolve, reject) => {
            try {
                this.s3.upload(params, (err: any, data) => {
                    if (err) { console.error("uploading error", err) }
                    else {
                        return resolve(data);
                    }
                });
            }
            catch (err) {
                throw reject(err);
            }
        });
    }
}


