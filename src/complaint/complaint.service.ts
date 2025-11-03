import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { CommonService } from 'src/common/common.service';
import { DbService } from 'src/db/db.service';
import { Booking } from 'src/booking/schema/booking.schema';
import { ComplaintAggregation } from './complaint.aggregation';
import * as path from "path";

import * as fs from "fs";
import * as Handlebars from "handlebars";
import * as  moment from 'moment';
import { EmailService } from 'src/common/common.emails.sesrvice';
import * as momentTz from 'moment-timezone';

@Injectable()
export class ComplaintService {
  constructor(
    private readonly model: DbService,
    private readonly complaintAggregation: ComplaintAggregation,
    private readonly commonService: CommonService,
    private readonly emailService: EmailService,
  ) { }
  async create(createComplaintDto: CreateComplaintDto, payload) {
    try {
      const already_exist = await this.model.complaints.findOne({ booking_id: createComplaintDto.booking_id })
      if (already_exist) {
        throw new HttpException({
          error_code: "COMPLAINT_ALREADY_EXISTS",
          error_description: "A complaint for this booking already exists. Please check the status or submit a new complaint for another booking."
        }, HttpStatus.BAD_REQUEST);
      }
      else {
        let data = {
          user_id: payload.user_id,
          image: createComplaintDto.image,
          posted_by: payload.scope,
          booking_id: createComplaintDto.booking_id,
          title: createComplaintDto.title,
          message: createComplaintDto.message,
          created_at: moment().valueOf()
        };
        await this.model.complaints.create(data);
        return { message: 'Complaint submitted successfully' };
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findAll(body) {
    try {
      let data_to_aggregate = [];
      let options = await this.commonService.set_options(body.page, body.limit);

      data_to_aggregate = [
        await this.complaintAggregation.pendingMatch(),
        await this.complaintAggregation.bookingLookup(),
        await this.complaintAggregation.unwind_bookingLookup(),
        await this.complaintAggregation.project(),
        await this.complaintAggregation.face_set(options),
      ];


      let data = await this.model.complaints.aggregate(data_to_aggregate);
      return { count: data[0]?.count[0]?.count, data: data[0]?.data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      let data_to_aggregate = [
        await this.complaintAggregation.Match(id),
        await this.complaintAggregation.bookingLookup(),
        await this.complaintAggregation.unwind_bookingLookup(),
        await this.complaintAggregation.customerLookup(),
        await this.complaintAggregation.driverLookup(),
        await this.complaintAggregation.ComplaintDetailproject(),
      ];
      const data = await this.model.complaints.aggregate(data_to_aggregate);
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async update(id: string, updateComplaintDto: UpdateComplaintDto, req) {
    try {
      const timezone = req.headers['timezone'] || 'Australia/Sydney';
      const complainData = await this.model.complaints.findOne({ _id: id })
      const booking = await this.model.booking.findOne({ _id: complainData.booking_id })
      let customer = await this.model.customers.findOne(
        { _id: complainData.user_id },
      );
      await this.model.complaints.updateOne(
        { _id: id }, { reply: updateComplaintDto.reply, reply_at: Date.now() }
      );
      if (customer) {
        // const submit_date = moment(complainData.created_at).format("DD/MM/YYYY")
        const submit_date = momentTz(complainData.created_at).tz(timezone).format("DD/MM/YYYY")
        this.emailService.replyForComplaint(customer.email, customer.name, booking.booking_id, submit_date, complainData.message, updateComplaintDto.reply, complainData.title)

        return { message: "Replied successfully" }
      }
    } catch (error) {
      throw error;
    }
  }

  async update_to_pending(id, body) {
    try {
      const find: any = await this.model.complaints.findOne({ _id: id })
      await this.model.complaints.updateOne({ _id: id }, { reply: null, reply_at: null })
      const customer = await this.model.customers.findOne({ _id: find.user_id })
      if (body.admin_remark) {
        this.emailService.apologyForComplaint(customer.email, customer.name, body.admin_remark)
        // const currentDir = __dirname;
        // const cabAppDir = path.resolve(currentDir, "../../");
        // let file_path = path.join(
        //   __dirname,
        //   '../../dist/email-template/admin-remark.hbs'
        // );
        // let html = fs.readFileSync(file_path, { encoding: "utf-8" });
        // const template = Handlebars.compile(html);
        // const data = {
        //   customer_name: customer.name,
        //   admin_message: body.admin_remark
        // };
        // const htmlToSend = template(data);
        // let mailData = {
        //   to: customer.email,
        //   subject: `Apology for Incorrect Complaint Response`,
        //   html: htmlToSend,
        // };
        // this.commonService.sendmail(
        //   mailData.to,
        //   mailData.subject,
        //   null,
        //   mailData.html
        // );
      }
      return { message: "successfully update to pending" }
    } catch (error) {
      throw error
    }
  }
}
