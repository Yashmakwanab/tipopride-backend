import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateCustomerDto,
  CustomerAddressDto,
  GuestLoginDto,
  VerifyPhone,
} from './dto/create-customer.dto';
import { NearRideDto, UpdateCustomerDto } from './dto/update-customer.dto';
import { DbService } from 'src/db/db.service';
import { JwtService } from '@nestjs/jwt';
import { CustomerAggregation } from './customer.aggreagtion';
import { CommonService } from 'src/common/common.service';
import * as path from "path";

import * as fs from "fs";
import * as Handlebars from "handlebars";
import { EmailService } from 'src/common/common.emails.sesrvice';
@Injectable()
export class CustomerService {
  constructor(
    private readonly model: DbService,
    private readonly customerAggregation: CustomerAggregation,
    private readonly commonService: CommonService,
    private readonly emailService: EmailService,
  ) { }


  async add_address(body: CustomerAddressDto, user_id: String) {
    try {
      let add_address
      const address_already_exist = await this.model.customerAddress.findOne({ customer_id: user_id, type: body.type })
      if (address_already_exist) {
        await this.model.customerAddress.updateOne({ _id: address_already_exist._id }, {
          name: body.name,
          lat: body.lat,
          long: body.long,
        })
        const data = await this.model.customerAddress.findOne({ _id: address_already_exist._id });
        return { data: data };
      }
      else {
        add_address = await this.model.customerAddress.create({
          name: body.name,
          lat: body.lat,
          long: body.long,
          type: body.type,
          customer_id: user_id,
        });
        return { data: add_address };
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async delete_address(id) {
    try {
      const result = await this.model.customerAddress.deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        return { message: 'Address not found or already deleted' };
      }
      return { message: 'Address deleted successfully' };
    } catch (error) {
      console.error('Error deleting address:', error);
      throw new Error('Failed to delete address');
    }
  }


  async get_customer_address(user_id) {
    try {
      const data = await this.model.customerAddress.find({ customer_id: user_id });
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async FindAllwithStatus(body) {
    try {
      let options = await this.commonService.set_options(body.page, body.limit);
      let data_to_aggregate
      if (body.status === "active") {
        data_to_aggregate = [
          await this.customerAggregation.match(),
          await this.customerAggregation.booking_count_lookup(),
          await this.customerAggregation.AddField(),
          await this.customerAggregation.fillter_data(body.search),
          await this.customerAggregation.projectFields(),
          await this.customerAggregation.face_set(options),
        ];
      }
      else if (body.status === "block") {
        data_to_aggregate = [
          await this.customerAggregation.BlockCustomerMatch(),
          await this.customerAggregation.booking_count_lookup(),
          await this.customerAggregation.AddField(),
          await this.customerAggregation.fillter_data(body.search),
          await this.customerAggregation.projectFields(),
          await this.customerAggregation.face_set(options),
        ];
      }
      else if (body.status === "deleted") {
        data_to_aggregate = [
          await this.customerAggregation.DeletedCustomermatch(),
          await this.customerAggregation.booking_count_lookup(),
          await this.customerAggregation.AddField(),
          await this.customerAggregation.fillter_data(body.search),
          await this.customerAggregation.projectFields(),
          await this.customerAggregation.face_set(options),
        ];
      }
      const data: any = await this.model.customers.aggregate(data_to_aggregate);
      return { count: data[0]?.count[0]?.count, data: data[0]?.data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async FindAllToExportwithStatus(body) {
    try {
      let data_to_aggregate
      if (body.status === "active") {
        data_to_aggregate = [
          await this.customerAggregation.match(),
          await this.customerAggregation.booking_count_lookup(),
          await this.customerAggregation.AddField(),
          await this.customerAggregation.fillter_data(body.search),
          await this.customerAggregation.projectFields(),
        ];
      }
      else if (body.status === "block") {
        data_to_aggregate = [
          await this.customerAggregation.BlockCustomerMatch(),
          await this.customerAggregation.booking_count_lookup(),
          await this.customerAggregation.AddField(),
          await this.customerAggregation.fillter_data(body.search),
          await this.customerAggregation.projectFields(),
        ];
      }
      else if (body.status === "deleted") {
        data_to_aggregate = [
          await this.customerAggregation.DeletedCustomermatch(),
          await this.customerAggregation.booking_count_lookup(),
          await this.customerAggregation.AddField(),
          await this.customerAggregation.fillter_data(body.search),
          await this.customerAggregation.projectFields(),
        ];
      }
      const data: any = await this.model.customers.aggregate(data_to_aggregate);
      return {data: data};
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async customer_details(id) {
    try {
      const data = await this.model.customers.findOne({ _id: id });
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async update_customer_active_deactive(body) {
    try {
      const user = await this.model.customers.findOne({ _id: body.id })
      let query = {};
      if (body.status === 'active') {
        query = { is_active: true };
      } else if (body.status === 'deactive') {
        const text = `Your account has been temporary deactivated by the administration. we have noticed some unprofessional activity from your side,we are reviewing your profile , we will notify you further`

        await this.emailService.deactivate(user.email, user.name, text, "Deactivated", "customer", body.reason)
        // let mail_data = {
        //   to: user.email,
        //   subject: 'Admin deactivate your account',
        //   text: body.reason
        // };
        // this.commonService.sendmail(
        //   mail_data.to,
        //   mail_data.subject,
        //   mail_data.text,
        // );
        await this.model.sessions.deleteMany({ user_id: body.id })
        query = { is_active: false };
      }
      await this.model.customers.updateOne(
        { _id: body.id },
        query,
      );
      return { message: 'Status update successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }



  async block(body) {
    try {
      const user = await this.model.customers.findOne({ _id: body.id })
      let query = {};
      if (body.status === 'block') {
        if (!body.reason) {
          throw new HttpException({ error_code: "PLEASE_ENTER_REASON", error_description: "please enter reaason" }, HttpStatus.BAD_REQUEST)
        }
        const text = `Your account has been temporary blocked by the administration. we have noticed some unprofessional activity from your side,we are reviewing your profile , we will notify you further`

        // await this.emailService.deactivate(user.email, user.name, text, "Blocked", "customer", body.reason)

        // const currentDir = __dirname;
        // const cabAppDir = path.resolve(currentDir, "../../");
        // let file_path = path.join(
        //   __dirname,
        //   '../../dist/email-template/block.hbs'
        // );
        // console.log("file_path", file_path);
        // let html = fs.readFileSync(file_path, { encoding: "utf-8" });
        // const template = Handlebars.compile(html);
        // const data = {
        //   user: user.name,
        //   reason: body.reason
        // };
        // const htmlToSend = template(data);
        // let mailData = {
        //   to: user.email,
        //   subject: `Your Account Has Been Blocked`,
        //   html: htmlToSend,
        // };
        // this.commonService.sendmail(
        //   mailData.to,
        //   mailData.subject,
        //   null,
        //   mailData.html
        // );
        await this.model.sessions.deleteMany({ user_id: body.id })
        query = { is_block: true, block_reason: body.reason };
      } else if (body.status === 'unblock') {
        query = { is_block: false };
        const text = `Your account has been unblocked by the administration. now you can go through with the process`
        // await this.emailService.deactivate(user.email, user.name, text, "Unblocked", "customer")
        //   const currentDir = __dirname;
        //   const cabAppDir = path.resolve(currentDir, "../../");
        //   console.log("hello", cabAppDir);
        //   let file_path = path.join(
        //     __dirname,
        //     '../../dist/email-template/unblock.hbs'
        //   );

        //   let html = fs.readFileSync(file_path, { encoding: "utf-8" });
        //   const template = Handlebars.compile(html);
        //   const data = {
        //     user: user.name,
        //   };
        //   const htmlToSend = template(data);
        //   let mailData = {
        //     to: user.email,
        //     subject: `Your Account Has Been Unblocked`,
        //     html: htmlToSend,
        //   };
        //   this.commonService.sendmail(
        //     mailData.to,
        //     mailData.subject,
        //     null,
        //     mailData.html
        //   );
      }
      await this.model.customers.updateOne(
        { _id: body.id },
        query,
      );
      return { message: 'Status update successfully' };
    }
    catch (error) {
      console.error('error', error);
      throw error;
    }
  }

  async customer_bookings(id: String, page, limit) {
    let options = await this.commonService.set_options(page, limit);
    try {
      let data_to_aggregate = [
        await this.customerAggregation.customer_match(id),
        await this.customerAggregation.customer_lookup(),
        await this.customerAggregation.driver_lookup(),
        await this.customerAggregation.vehicle_lookup(),
        await this.customerAggregation.unwindVehicleData(),
        await this.customerAggregation.unwind__customerdata(),
        await this.customerAggregation.unwind_driverdata(),
        await this.customerAggregation.project(),
        await this.customerAggregation.face_set(options),
      ]
      const data = await this.model.booking.aggregate(data_to_aggregate)

      return { count: data[0]?.count[0]?.count, data: data[0]?.data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async near_me_rides(body: NearRideDto) {
    try {
      const nearDrivers = [];
      const drivers = await this.model.drivers.find({
        status: 'online',
        ride_status: 'free',
        is_approved: true,
        is_block: false,
        is_active: true,
        is_deleted: false,
      });
      // console.log("all drivers................",drivers);
      for (const driver of drivers) {
        const distance = await this.commonService.calculate_radius_distance(
          driver.latitude,
          driver.longitude,
          body.latitude,
          body.longitude,
        );
        // console.log("driver distance.....................",distance);

        if (distance <= 5) {
          nearDrivers.push({
            id: driver._id, // Assuming _id is the driver's ID field
            latitude: driver.latitude,
            longitude: driver.longitude,
            heading: driver.heading,
            vehicle_type_id: driver.vehicle_type_id,
          });
        }
      }
      return { data: nearDrivers };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
}
