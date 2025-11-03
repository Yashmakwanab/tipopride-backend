import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateContactusDto, FindContactUsDto } from './dto/create-contactus.dto';
import { UpdateContactusDto } from './dto/update-contactus.dto';
import { CommonService } from 'src/common/common.service';
import { DbService } from 'src/db/db.service';
import { Types } from 'mongoose';
import { EmailService } from 'src/common/common.emails.sesrvice';
import * as moment from 'moment';
import * as momentTz from 'moment-timezone';

@Injectable()
export class ContactusService {
  constructor(
    private readonly commonService: CommonService,
    private readonly emailService: EmailService,
    private readonly model: DbService,
  ) { }
  async create(createContactusDto: CreateContactusDto, payload) {
    try {
      let data = {
        user_id: payload.user_id,
        name: createContactusDto.name,
        email: createContactusDto.email,
        posted_by: payload.scope,
        message: createContactusDto.message,
        created_at: +new Date()
      };
      await this.model.contactus.create(data);
      return { message: 'successfully added' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async createForWeb(createContactusDto: CreateContactusDto) {
    try {
      let data = {
        name: createContactusDto.name,
        email: createContactusDto.email,
        posted_by: "customer",
        message: createContactusDto.message,
      };
      await this.model.contactus.create(data);
      return { message: 'successfully added' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
  async findAll(body: FindContactUsDto) {
    try {
      let query = {
        is_deleted: false,
        ...(body.status === 'pending') && { reply: null },
        ...(body.status === 'replied') && {
          reply: { $ne: null, }
        }
      }
      let options = await this.commonService.set_options(+body.page, +body.limit);
      const data = await this.model.contactus.find(query, {}, options);
      const count = await this.model.contactus.countDocuments(query);

      return { count, data };

    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
  async findOne(id: string) {
    try {
      const data = await this.model.contactus.findOne({ _id: new Types.ObjectId(id), is_deleted: false, });
      if (!data) {
        throw new HttpException({ error_description: 'Something went wrong!!', error_code: 'REQUEST_FAILED' }, HttpStatus.BAD_REQUEST)
      }
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
  async update(id: string, updateContactusDto: UpdateContactusDto, req) {
    try {
      const timezone = req.headers['timezone'] || 'Australia/Sydney';
      const data = await this.model.contactus.findOne({ _id: id });
      let email;
      if (data.posted_by === 'driver') {
        email = await this.model.drivers.findOne(
          { _id: data.user_id },
          { email: 1, name: 1 },
        );
      } else if (data.posted_by === 'customer') {
        email = await this.model.customers.findOne(
          { _id: data.user_id },
          { email: 1, name: 1 },
        );
      }
      await this.model.contactus.updateOne(
        { _id: id }, { reply: updateContactusDto.reply, reply_at: Date.now() }
      );
      if (email) {
        // let mail_data = {
        //   to: email.email,
        //   subject: 'Admin reply your query',
        //   text: updateContactusDto.reply,
        // };
        // const date = moment(data.created_at).add(5, 'hour').add(30, 'minute').format('DD MMM YYYY hh:mm')
        const date = momentTz(data.created_at).tz(timezone).format('DD MMM YYYY hh:mm')

        this.emailService.contactUsReply(email.email, email.name, date, data.message, updateContactusDto.reply)
        // this.commonService.sendmail(
        //   mail_data.to,
        //   mail_data.subject,
        //   mail_data.text,
        // );
        return { message: "Replied successfully" }
      }
    } catch (error) {
      throw error;
    }
  }

  async delete(id) {
    try {
      await this.model.contactus.findOneAndUpdate(
        { _id: id }, { is_deleted: true, updated_at: Date.now() }
      );
      throw new HttpException({ messgae: 'Query deleted' }, HttpStatus.OK)
    } catch (error) {
      throw error;
    }
  }
}
