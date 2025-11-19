import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import * as moment from 'moment';
import * as path from 'path';

import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import {
  DocumentDetailDto,
  DriverStatusDto,
  licence_update,
  vehicleDetailDto,
} from './dto/driver.dto';
import { CommonService } from 'src/common/common.service';
import * as mongosse from 'mongoose';
import { DriverAggregation } from './driver.aggregation';
import { CustomerAggregation } from 'src/customer/customer.aggreagtion';
import { AuthService } from 'src/auth/auth.service';
import { BookingStatus } from 'src/booking/schema/booking.schema';
import { Payment_type } from 'src/payment/schema/payment.schema';
import { VehicleStatus } from './schema/vehicle-detail.schema';
import { DriverStatus } from './schema/driver.schema';
import { EarningAggregation } from 'src/earning/earning.aggregation';
import { EmailService } from 'src/common/common.emails.sesrvice';
import { NotificationService } from 'src/notification/notification.service';
import { DriverForChatByDispatcherDto } from './dto/search-driver.dto';
import { Socket, Server } from 'socket.io';
import {
  WebSocketServer,
  WebSocketGateway,
} from '@nestjs/websockets';
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})

@Injectable()
export class DriverService {
  constructor(
    private readonly model: DbService,
    private readonly earningAggregation: EarningAggregation,
    private readonly commonService: CommonService,
    private readonly notification: NotificationService,
    private readonly driverAggregation: DriverAggregation,
    private readonly customerAggragation: CustomerAggregation,
    private readonly emailService: EmailService,
  ) { }

  @WebSocketServer()
  server: Server;

  async update_driver_location(user_id: string, payload) {
    try {
      await this.model.drivers.updateOne(
        { _id: new mongosse.Types.ObjectId(user_id) },
        {
          latitude: payload.latitude,
          longitude: payload.longitude,
          heading: payload.heading,
          location: {
            type: "Point",
            coordinates: [payload.longitude, payload.latitude], // Note: [longitude, latitude]
          },
        },
      );
      const data = await this.model.drivers.findOne({
        _id: new mongosse.Types.ObjectId(user_id),
      });
      return data;
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async set_vehicle_details(body: vehicleDetailDto, payload, req) {
    try {
      const { user_id } = payload;
      const driver = await this.model.drivers.findOne({ _id: payload.user_id });
      const vehicale = await this.model.vehicle.findOne({ vehicle_id: new mongosse.Types.ObjectId(body.vehicle_id) });
      const in_ative_other_vehicle = await this.model.vehicle_detail.updateMany(
        { driver_id: new mongosse.Types.ObjectId(user_id) },
        { status: VehicleStatus.Deativate }
      );
      const add = await this.model.vehicle_detail.create({
        name: body.name,
        model: body.model,
        color: body.color,
        vehicle_photo: body.vehicle_photo,
        number: body.number,
        vehicle_id: body.vehicle_id,
        driver_id: user_id,
        child_seat_availabilty: body.child_seat_availabilty,
        wheel_chair_availabilty: body.wheel_chair_availabilty,
        child_capsule_availabilty: body.child_capsule_availabilty,
        vehicle_registration_image: body.vehicle_registration_image,
        vehicle_insurance_image: body.vehicle_insurance_image,
        status: VehicleStatus.Requested,
        no_of_seat: body.no_of_seat,
        no_of_childseat: body.no_of_childseat,
        no_of_wheelchair: body.no_of_wheelchair,
        no_of_childcapsule: body.no_of_childcapsule,

      });

      console.log('body', body)
      console.log('add >>>>>>>>>>>>>>>>>>>>>>>>>', add)
      this.emailService.welcomeEmail(driver.name, driver.email, payload.scope);

      let add_history = {
        driver_id: user_id,
        vehicle_detail_id: add._id,
        description: 'Add new vehicle',
        created_at: Date.now(),
      };
      await this.model.docsUpdateHistory.create(add_history);
      await this.model.drivers.updateOne(
        { _id: payload.user_id },
        {
          set_up_vehicle: true,
          set_up_documents: true,
          commission: +vehicale?.commission_percentage,
          vehicle_type_id: body.vehicle_id,
          updated_at: moment().valueOf(),
          status: DriverStatus.Offline,
          is_doc_update: driver.is_approved ? true : false,
          is_approved: null
        },
      );
      let language = req.headers['language'] || 'english';
      const key = 'vehicle_detail_add';
      const localization = await this.commonService.localization(language, key);
      return { message: localization[language] };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }


  async driverPayoutTransaction(body) {
    try {
      const skip = (body.page - 1) * body.limit;
      let data = await this.model.driverPayoutHistory
        .find({ driver_id: body.driver_id })
        .skip(skip)
        .limit(body.limit);
      let data_count =
        await this.model.driverPayoutHistory.countDocuments({
          driver_id: body.driver_id,
        });
      return { data_count: data_count, data: data };
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  }

  async set_document_details(body: DocumentDetailDto, payload, req) {
    try {
      if (payload.scope === 'driver') {
        const document_already_set = await this.model.documentsDetails.findOne({
          vehicle_detail_id: body.vehicle_detail_id,
        });
        //if document already set then update document detail otherwise add document deail
        if (document_already_set) {
          await this.model.documentsDetails.updateOne(
            { _id: document_already_set._id },
            {
              vehicle_insurance_image: body.vehicle_insurance_image,
              vehicle_registration_image: body.vehicle_registration_image,
            },
          );
          let language = req.headers['language'] || 'english';
          const key = 'document_update';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          return { message: localization[language] };
        } else {
          await this.model.documentsDetails.create({
            vehicle_detail_id: body.vehicle_detail_id,
            vehicle_insurance_image: body.vehicle_insurance_image,
            vehicle_registration_image: body.vehicle_registration_image,
            driver_id: payload.user_id,
          });
          await this.model.drivers.updateOne(
            { _id: payload.user_id },
            { set_up_documents: true },
          );
          let language = req.headers['language'] || 'english';
          const key = 'document_add';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          return { message: localization[language] };
        }
      } else {
        throw new HttpException(
          { error_code: 'unauthorized', error_description: 'unauthorized' },
          HttpStatus.UNAUTHORIZED,
        );
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async get_all_vehicle(user_id: string, req) {
    try {
      const data = await this.model.vehicle_detail.find({
        driver_id: user_id,
      });
      if (data.length) {
        return { data: data };
      } else {
        let language = req.headers['language'] || 'english';
        const key = 'not_found';
        const localization = await this.commonService.localization(
          language,
          key,
        );
        throw new HttpException(
          {
            error_code: localization[language],
            error_description: localization[language],
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async get_vehicle_detail(vehicle_id: string, req) {
    try {
      let response
      const data: any = await this.model.vehicle_detail.findOne({
        _id: vehicle_id,
      });

      if (data) {
        let vehicle_price = await this.model.vehicle.findOne({ vehicle_id: data.vehicle_id })
        console.log("vehicle_price.....", vehicle_price);
        // Add passenger, luggage, and handbags details with fallback values
        data.passenger = vehicle_price?.passenger || 0;
        data.luggage = vehicle_price?.luggage || 0;
        data.handbags = vehicle_price?.handbags || 0;
        response = {
          ...data.toObject(),
          passenger: vehicle_price?.passenger || 0,
          luggage: vehicle_price?.luggage || 0,
          handbags: vehicle_price?.handbags || 0
        }
        // Return the updated data
        return { data: response };
      } else {
        let language = req.headers['language'] || 'english';
        const key = 'not_found';
        const localization = await this.commonService.localization(
          language,
          key,
        );

        throw new HttpException(
          {
            error_code: localization[language],
            error_description: localization[language],
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async get_document_detail(user_id: string, req) {
    try {
      const data = await this.model.documentsDetails.findOne({
        driver_id: user_id,
      });
      if (data) {
        return { data: data };
      } else {
        let language = req.headers['language'] || 'english';
        const key = 'not_found';
        const localization = await this.commonService.localization(
          language,
          key,
        );

        throw new HttpException(
          {
            error_code: localization[language],
            error_description: localization[language],
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async go_online(id: String, body: DriverStatusDto, req) {
    try {

      const driver = await this.model.drivers.findOne({ _id: id });
      const addOneDay = moment(driver.pending_submit_cash_upated_at)
        .add(1, 'day')
        .valueOf();
      const current_time = moment.now().valueOf();
      if (driver.pending_submit_cash > 0 && current_time >= addOneDay) {
        throw new HttpException(
          {
            error_code: 'AMOUNT_PENDING',
            error_description: 'AMOUNT_PENDING',
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        if (driver.doc_expiry_type !== null && body.status === "online") {
          throw new HttpException(
            {
              error_code: 'Document expired!',
              error_description: 'Document expired',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        await this.model.drivers.updateOne(
          { _id: id },
          { status: body.status },
        );
        const language = req.headers['language'] || 'english';
        const key = 'status_update_successfully';
        const localization = await this.commonService.localization(language, key);
        return { message: localization[language] };
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async FindAllwithStatus(body) {
    try {
      let options = await this.commonService.set_options(body.page, body.limit);
      let data_to_aggregate;
      if (body.status === 'active') {
        data_to_aggregate = [
          await this.driverAggregation._drivermatch(),
          await this.driverAggregation.booking_count_lookup(),
          await this.driverAggregation.AddField(),
          await this.driverAggregation.fillter_data(body.search),
          await this.driverAggregation.projectFields(),
          await this.driverAggregation.face_set(options),
        ];
      } else if (body.status === 'in-active') {
        data_to_aggregate = [
          await this.driverAggregation.InActiveDriverMatch(),
          await this.driverAggregation.booking_count_lookup(),
          await this.driverAggregation.AddField(),
          await this.driverAggregation.fillter_data(body.search),
          await this.driverAggregation.projectFields(),
          await this.driverAggregation.face_set(options),
        ];
      } else if (body.status === 'block') {
        data_to_aggregate = [
          await this.driverAggregation.Blockdrivermatch(),
          await this.driverAggregation.booking_count_lookup(),
          await this.driverAggregation.AddField(),
          await this.driverAggregation.fillter_data(body.search),
          await this.driverAggregation.projectFields(),
          await this.driverAggregation.face_set(options),
        ];
      } else if (body.status === 'deleted') {
        data_to_aggregate = [
          await this.driverAggregation.Deleteddrivermatch(),
          await this.driverAggregation.booking_count_lookup(),
          await this.driverAggregation.AddField(),
          await this.driverAggregation.fillter_data(body.search),
          await this.driverAggregation.projectFields(),
          await this.driverAggregation.face_set(options),
        ];
      }
      const data: any = await this.model.drivers.aggregate(data_to_aggregate);
      return { count: data[0]?.count[0]?.count, data: data[0]?.data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async ExportAllwithStatus(body) {
    try {
      let data_to_aggregate;
      if (body.status === 'active') {
        data_to_aggregate = [
          await this.driverAggregation._drivermatch(),
          await this.driverAggregation.booking_count_lookup(),
          await this.driverAggregation.AddField(),
          await this.driverAggregation.fillter_data(body.search),
          await this.driverAggregation.bank_detail_lookup(),
          await this.driverAggregation.unwind_bank_detail(),
          await this.driverAggregation.vehicle_detail_lookup(),
          await this.driverAggregation.unwind_vehicle_details(),
          await this.driverAggregation.vehicle_type_lookup(),
          await this.driverAggregation.unwind_vehicle_type_details(),
          await this.driverAggregation.projectFields(),
        ];
      } else if (body.status === 'in-active') {
        data_to_aggregate = [
          await this.driverAggregation.InActiveDriverMatch(),
          await this.driverAggregation.booking_count_lookup(),
          await this.driverAggregation.AddField(),
          await this.driverAggregation.fillter_data(body.search),
          await this.driverAggregation.bank_detail_lookup(),
          await this.driverAggregation.unwind_bank_detail(),
          await this.driverAggregation.vehicle_detail_lookup(),
          await this.driverAggregation.unwind_vehicle_details(),
          await this.driverAggregation.vehicle_type_lookup(),
          await this.driverAggregation.unwind_vehicle_type_details(),
          await this.driverAggregation.projectFields(),
        ];
      } else if (body.status === 'block') {
        data_to_aggregate = [
          await this.driverAggregation.Blockdrivermatch(),
          await this.driverAggregation.booking_count_lookup(),
          await this.driverAggregation.AddField(),
          await this.driverAggregation.fillter_data(body.search),
          await this.driverAggregation.bank_detail_lookup(),
          await this.driverAggregation.unwind_bank_detail(),
          await this.driverAggregation.vehicle_detail_lookup(),
          await this.driverAggregation.unwind_vehicle_details(),
          await this.driverAggregation.vehicle_type_lookup(),
          await this.driverAggregation.unwind_vehicle_type_details(),
          await this.driverAggregation.projectFields(),
        ];
      } else if (body.status === 'deleted') {
        data_to_aggregate = [
          await this.driverAggregation.Deleteddrivermatch(),
          await this.driverAggregation.booking_count_lookup(),
          await this.driverAggregation.AddField(),
          await this.driverAggregation.fillter_data(body.search),
          await this.driverAggregation.bank_detail_lookup(),
          await this.driverAggregation.unwind_bank_detail(),
          await this.driverAggregation.vehicle_detail_lookup(),
          await this.driverAggregation.unwind_vehicle_details(),
          await this.driverAggregation.vehicle_type_lookup(),
          await this.driverAggregation.unwind_vehicle_type_details(),
          await this.driverAggregation.projectFields(),
        ];
      }
      const data: any = await this.model.drivers.aggregate(data_to_aggregate);
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }


  async driver_details(id: string) {
    try {
      let data_to_aggregate = await this.driverAggregation.driverDetailPipeline(id)
      const driverData = await this.model.drivers.aggregate(data_to_aggregate);
      return { data: driverData[0] };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async FindDriverRequests(body) {
    try {
      let data_to_aggregate;
      let options = await this.commonService.set_options_ace(body.page, body.limit);
      if (body.status === 'pending') {
        data_to_aggregate = [
          await this.driverAggregation._driverRequestmatch(),
          await this.driverAggregation.fillter_data(body.search),
          await this.driverAggregation.driverRequestprojectFields(),
          // await this.driverAggregation.face_set_ace(options),
          await this.driverAggregation.face_set(options),
        ];
      }
      if (body.status === 'reject') {
        data_to_aggregate = [
          await this.driverAggregation._driverRequestRejectmatch(),
          await this.driverAggregation.fillter_data(body.search),
          await this.driverAggregation.driverRequestprojectFields(),
          await this.driverAggregation.face_set(options),
        ];
      }
      const data: any = await this.model.drivers.aggregate(data_to_aggregate);
      return { count: data[0]?.count[0]?.count, data: data[0]?.data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async UpdatedDocsRequests(body) {
    try {
      let options = await this.commonService.set_options(body.page, body.limit);
      let data_to_aggregate: any = [
        await this.driverAggregation._UpdatedDocsRequestmatch(),
        await this.driverAggregation.fillter_data(body.search),
        await this.driverAggregation.UpdateDocsRequestprojectFields(),
        await this.driverAggregation.face_set(options),
      ];
      const data: any = await this.model.drivers.aggregate(data_to_aggregate);
      return { count: data[0]?.count[0]?.count, data: data[0]?.data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async UpdateDriverRequests(body) {
    try {
      console.log("UpdateDriverRequests--called");

      let query = {};
      let driver = await this.model.drivers.findOne({ _id: body.id });
      const session = await this.model.sessions.findOne({ user_id: body.id });
      if (body.status === 'accept') {

        const currentDate = moment().utc();
        const licenceExpiryDate = moment(driver.licence_expiry_date).utc();

        if (licenceExpiryDate.isSameOrBefore(currentDate)) {
          throw new HttpException('Licence expired', HttpStatus.BAD_REQUEST);
        }

        if (session) {
          let key_1_driver = 'approve_request_title';
          let key_2_driver = 'approve_request_description';
          const approve_title = await this.commonService.localization(
            driver.preferred_language,
            key_1_driver,
          );
          const approve_description = await this.commonService.localization(
            driver.preferred_language,
            key_2_driver,
          );
          let push_data = {
            title: approve_title[driver.preferred_language],
            message: approve_description[driver.preferred_language],
          };
          let data = {
            type: 'admin',
          };
          this.notification.send_notification(
            push_data,
            session.fcm_token,
            data,
          );
        }
        this.emailService.sent_email_for_approve_docs(driver);
        query = {
          is_approved: true,
          approved_on: moment().valueOf(),
          is_doc_update: false,
          is_active: true,
          reject_on: null,
          doc_expiry_type: null
        };
        await this.model.vehicle_detail.updateOne(
          { driver_id: body.id, status: VehicleStatus.Requested },
          { status: 'active', approved_on: Date.now() },
        );
        await this.model.docsUpdateHistory.updateMany(
          { driver_id: body.id },
          { status: 'verified' },
        );
      } else if (body.status === 'decline') {
        query = {
          is_approved: false,
          reject_on: moment().valueOf(),
          is_doc_update: false,
          reject_reason: body.reason,
        };
        await this.model.vehicle_detail.updateOne(
          { driver_id: body.id, status: 'requested' },
          { status: 'deactive' },
        );
        if (body.reason) {
          if (session) {
            let push_data = {
              title: 'TipTop Support Team',
              message:
                'Your account has been rejected by the Account Manager.for more clarity refer to your registered email or Contact 0296699390',
            };
            let data = {
              type: JSON.stringify('admin'),
            };
            this.notification.send_notification(
              push_data,
              session.fcm_token,
              data,
            );
          }
          this.emailService.sent_email_for_reject_docs(driver, body);
        } else {
          throw new HttpException(
            {
              error_code: 'enter the reason',
              error_description: 'enter the reason',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      const updatedDriver = await this.model.drivers.findOneAndUpdate(
        { _id: new mongosse.Types.ObjectId(body.id) },
        { doc_expiry_type: null },
        { new: true }
      );
      await this.model.drivers.findOneAndUpdate({ _id: new mongosse.Types.ObjectId(body.id) }, query, { returnDocument: "after" });
      return { message: 'Driver request updated.', data: updatedDriver };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  // async sent_email_for_approve_docs(driver) {
  //   try {
  //     const currentDir = __dirname;
  //     const cabAppDir = path.resolve(currentDir, '../../');
  //     let file_path = path.join(
  //       __dirname,
  //       '../../dist/email-template/approve-docs.hbs',
  //     );
  //     let html = fs.readFileSync(file_path, { encoding: 'utf-8' });
  //     const template = Handlebars.compile(html);
  //     const data = {
  //       driverName: driver.name,
  //     };
  //     const htmlToSend = template(data);

  //     let mailData = {
  //       to: driver.email,
  //       subject:
  //         'Your Documents Are Verified – You’re Ready to Drive with TipTop Cabby! 🚗',
  //       html: htmlToSend,
  //     };
  //     this.commonService.sendmail(
  //       mailData.to,
  //       mailData.subject,
  //       null,
  //       mailData.html,
  //     );
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // async sent_email_for_reject_docs(driver, body) {
  //   try {
  //     const currentDir = __dirname;
  //     const cabAppDir = path.resolve(currentDir, '../../');
  //     let file_path = path.join(
  //       __dirname,
  //       '../../dist/email-template/reject-docs.hbs',
  //     );
  //     let html = fs.readFileSync(file_path, { encoding: 'utf-8' });
  //     const template = Handlebars.compile(html);
  //     const data = {
  //       driverName: driver.name,
  //       reason: body.reason,
  //     };
  //     const htmlToSend = template(data);
  //     let mailData = {
  //       to: driver.email,
  //       subject:
  //         'Important: Document Verification Unsuccessful – Account Cannot Be Activated',
  //       html: htmlToSend,
  //     };
  //     this.commonService.sendmail(
  //       mailData.to,
  //       mailData.subject,
  //       null,
  //       mailData.html,
  //     );
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async update_driver_active_deactive(body) {
    try {
      let driver = await this.model.drivers.findOne({ _id: body.id });
      let query = {};
      if (body.status === 'active') {
        query = { is_active: true };
      } else if (body.status === 'deactive') {
        query = { is_active: false };
        if (body.reason) {
          const text = `Your account has been temporary deactivated by the administration. we have noticed some unprofessional activity from your side,we are reviewing your profile , we will notify you further`

          await this.emailService.deactivate(driver.email, driver.name, text, "Deactivated", null, body.reason)
          // let mail_data = {
          //   to: driver.email,
          //   subject: 'Admin deactivate  your account',
          //   text: body.reason,
          // };
          // this.commonService.sendmail(
          //   mail_data.to,
          //   mail_data.subject,
          //   mail_data.text,
          // );
          await this.model.sessions.deleteMany({
            user_id: body.id,
          });
        } else {
          throw new HttpException(
            {
              error_code: 'enter the reason',
              error_description: 'enter the reason',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      await this.model.drivers.updateOne({ _id: body.id }, query);
      return { message: 'Status update successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
  async update_driver_block_unblock(body) {
    try {
      let driver = await this.model.drivers.findOne({ _id: body.id });
      let query = {};
      if (body.status === 'unblock') {
        query = { is_block: false };
        const text = `Your account has been unblocked by the administration. now you can go through with the process`
        await this.emailService.deactivate(driver.email, driver.name, text, "Unblocked")
        // this.sent_email_for_unblock(driver);
      } else if (body.status === 'block') {
        query = { is_block: true, block_reason: body.reason };
        if (body.reason) {
          const text = `Your account has been temporary blocked by the administration. we have noticed some unprofessional activity from your side,we are reviewing your profile , we will notify you further`

          await this.emailService.deactivate(driver.email, driver.name, text, "Blocked", null, body.reason)
          // this.sent_email_for_block(driver, body);
          await this.model.sessions.deleteMany({
            user_id: body.id,
          });
        } else {
          throw new HttpException(
            {
              error_code: 'enter the reason',
              error_description: 'enter the reason',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      await this.model.drivers.updateOne({ _id: body.id }, query);
      return { message: 'Status update successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  // async sent_email_for_unblock(driver) {
  //   try {
  //     const currentDir = __dirname;
  //     const cabAppDir = path.resolve(currentDir, '../../');
  //     let file_path = path.join(
  //       __dirname,
  //       '../../dist/email-template/unblock.hbs',
  //     );
  //     let html = fs.readFileSync(file_path, { encoding: 'utf-8' });
  //     const template = Handlebars.compile(html);
  //     const data = {
  //       user: driver.name,
  //     };
  //     const htmlToSend = template(data);
  //     let mailData = {
  //       to: driver.email,
  //       subject: `Your Account Has Been Unblocked`,
  //       html: htmlToSend,
  //     };
  //     this.commonService.sendmail(
  //       mailData.to,
  //       mailData.subject,
  //       null,
  //       mailData.html,
  //     );
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // async sent_email_for_block(driver, body) {
  //   try {
  //     const currentDir = __dirname;
  //     const cabAppDir = path.resolve(currentDir, '../../');
  //     console.log('hello', cabAppDir);

  //     let file_path = path.join(
  //       __dirname,
  //       '../../dist/email-template/block.hbs',
  //     );

  //     console.log('file_path', file_path);
  //     let html = fs.readFileSync(file_path, { encoding: 'utf-8' });

  //     const template = Handlebars.compile(html);
  //     const data = {
  //       user: driver.name,
  //       reason: body.reason,
  //     };
  //     const htmlToSend = template(data);

  //     let mailData = {
  //       to: driver.email,
  //       subject: `Your Account Has Been Blocked`,
  //       html: htmlToSend,
  //     };

  //     this.commonService.sendmail(
  //       mailData.to,
  //       mailData.subject,
  //       null,
  //       mailData.html,
  //     );
  //   } catch (error) {
  //     throw error;
  //   }
  // }
  async driver_booking_list(id, page, limit) {
    let options = await this.commonService.set_options(page, limit);
    try {
      let data_to_aggregate = [
        await this.customerAggragation.driver_match(id),
        await this.customerAggragation.customer_lookup(),
        await this.customerAggragation.driver_lookup(),
        await this.customerAggragation.unwind__customerdata(),
        await this.customerAggragation.unwind_driverdata(),
        await this.customerAggragation.project(),
        await this.customerAggragation.face_set(options),
      ];
      const data = await this.model.booking.aggregate(data_to_aggregate);

      return { count: data[0]?.count[0]?.count, data: data[0]?.data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async driver_vehicle_detail(id) {
    try {
      const data: any = await this.model.vehicle_detail
        .findOne({ _id: id })
        .populate(['vehicle_id']).lean();

      const vehicle_price = await this.model.vehicle
        .findOne({ vehicle_id: data?.vehicle_id?._id }, { handbags: 1, luggage: 1, passenger: 1 }, { lean: true });

      data['vehicle_price'] = vehicle_price

      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async SetExpiryDate(body, id) {
    try {
      await this.model.vehicle_detail.updateOne(
        { _id: body.vehicle_detail_id },
        {
          insurance_expiry_date: body.insurance_expiry_date,
          registration_expiry_date: body.registration_expiry_date,
        },
      );
      await this.model.drivers.updateOne(
        { _id: id },
        { licence_expiry_date: body.licence_expiry_date },
      );
      return { message: 'successfully set dates' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
  async edit_vehicle_details(vehicleDetailDto, driver_id) {
    try {
      let finalMessage;
      if (vehicleDetailDto.edit_items) {
        let messages = [];

        if (vehicleDetailDto.edit_items.includes('model')) {
          messages.push('Model');
        }
        if (vehicleDetailDto.edit_items.includes('category')) {
          messages.push('category');
        }
        if (vehicleDetailDto.edit_items.includes('color')) {
          messages.push('color');
        }
        if (vehicleDetailDto.edit_items.includes('vehicle_photo')) {
          messages.push('vehicle_photo');
        }
        if (vehicleDetailDto.edit_items.includes('no_of_childseat')) {
          messages.push('no_of_childseat');
        }
        if (vehicleDetailDto.edit_items.includes('no_of_wheelchair')) {
          messages.push('no_of_wheelchair');
        }
        if (vehicleDetailDto.edit_items.includes('no_of_childcapsule')) {
          messages.push('no_of_childcapsule');
        }
        if (vehicleDetailDto.edit_items.includes('number')) {
          messages.push('number');
        }
        if (vehicleDetailDto.edit_items.includes('name')) {
          messages.push('Name');
        }

        if (vehicleDetailDto.edit_items.includes('insurance')) {
          messages.push('Insurance');
        }

        if (vehicleDetailDto.edit_items.includes('registration')) {
          messages.push('Registration');
        }
        if (vehicleDetailDto.edit_items.includes('no_of_seat')) {
          messages.push('no_of_seat');
        }
        if (vehicleDetailDto.edit_items.includes('comfort')) {
          messages.push('comfort');
        }

        // Concatenate all messages into one string, separated by commas
        finalMessage = messages.join(', ');
        if (finalMessage) {
          finalMessage = 'Driver, update these details ' + finalMessage;
        }
        let add_history = {
          driver_id: driver_id,
          vehicle_detail_id: vehicleDetailDto.vehicle_detail_id,
          description: finalMessage,
          created_at: Date.now(),
        };
        await this.model.docsUpdateHistory.create(add_history);
      }

      await this.model.vehicle_detail.updateMany(
        { _id: { $ne: vehicleDetailDto.vehicle_detail_id }, driver_id: driver_id },
        {
          $set: {
            status: VehicleStatus.Deativate,
          },
        },
      );

      await this.model.vehicle_detail.updateOne(
        { _id: vehicleDetailDto.vehicle_detail_id },
        {
          $set: {
            ...vehicleDetailDto,
            status: VehicleStatus.Requested,
          },
        },
      );
      const vehicale = await this.model.vehicle.findOne({ vehicle_id: new mongosse.Types.ObjectId(vehicleDetailDto.vehicle_id) })
      await this.model.drivers.updateOne(
        { _id: driver_id },
        {
          vehicle_type_id: vehicleDetailDto.vehicle_id,
          is_approved: null,
          commission: +vehicale?.commission_percentage,
          is_doc_update: true,
          status: DriverStatus.Offline,
          updated_at: moment().valueOf(),
        },
      );
      return { message: 'vehicle update successfully' };
    } catch (error) {
      console.error('error', error);
      throw error;
    }
  }

  async UpdateDriverLocation(body, driver_id) {
    try {
      const driver = await this.model.drivers.findByIdAndUpdate(
        driver_id,
        {
          latitude: body.latitude,
          longitude: body.longitude,
          heading: body.heading,
          updated_at: moment().add(5, 'hours').add(30, 'minutes'),
          location: {
            type: "Point",
            coordinates: [parseFloat(body.longitude), parseFloat(body.latitude)], // Note: [longitude, latitude]
          },
        },
        { new: true }
      );
      if (!driver) {
        throw new HttpException(
          { error_description: 'Something went wrong. Try again!', error_code: 'Failed Request' },
          HttpStatus.BAD_REQUEST)
      }

      const ongoingBooking = await this.GetOngoingBookings(driver_id)
      if (ongoingBooking) {
        this.server.to(ongoingBooking.customer_socket_id).emit('current_driver_location', ongoingBooking.driver);
      }
      this.server.to(driver.socket_id).emit('update_location', driver);

      return { message: 'Location successfully updated' };
    } catch (error) {
      throw error;
    }
  }

  async driver_location(body) {
    try {
      const driver = await this.model.drivers.find(
        { _id: body.id },
        { latitude: 1, longitude: 1, heading: 1 },
      );
      return { data: driver };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async get_driver_vehicles(driver_id: string, body) {
    try {
      const data = await this.model.vehicle_detail
        .find({ driver_id })
        .populate(['vehicle_id'])
        .skip(body.skip)
        .limit(body.limit);
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findCustomer(id) {
    try {
      const data = await this.model.customers.findOne({ _id: id });
      return data;
    } catch (error) {
      throw error;
    }
  }

  async drivers_earnings(id: string) {
    try {
      const startOfWeek = moment().startOf('week').valueOf()
      const endOfWeek = moment().endOf('week').valueOf()
      const pipeline = await this.earningAggregation.driverEarning(id, startOfWeek, endOfWeek)
      const earning = await this.model.booking.aggregate(pipeline)
      const formattedData = []
      formattedData.push({
        week_start: startOfWeek,
        week_end: endOfWeek,
        no_of_trips: earning[0]?.total_bookings ?? 0,
        tips_from_rider: 0,
        total_tax_amount: earning[0]?.total_tax ?? 0,
        total_trips_amount: earning[0]?.total_amount ?? 0,
        amount_to_be_paid: earning[0]?.driver_earning ?? 0,
        app_commission: earning[0]?.app_commission ?? 0,
        cash_you_have: earning[0]?.total_invoice_amount ?? 0,
        total_amount_to_be_paid: (earning[0]?.total_invoice_amount < earning[0]?.driver_earning) ? earning[0]?.driver_earning - earning[0]?.total_invoice_amount : earning[0]?.driver_earning ?? 0,
        you_need_to_pay: (earning[0]?.total_invoice_amount > earning[0]?.driver_earning) ? earning[0]?.total_invoice_amount - earning[0]?.driver_earning : 0,
        payment_status: (endOfWeek > moment().valueOf()) ? 'pending' : 'completed',
        payout_initiated: moment(endOfWeek).add(1, 'day').valueOf(),
        pending_amount_pay_on: 0,
      });
      return { data: formattedData };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async DriverActiveVehicle(driver_id) {
    try {
      const data = await this.model.vehicle_detail.findOne({
        _id: driver_id,
        status: 'active',
      });
      return { data: data };
    } catch (error) {
      console.log('error', error);
    }
  }

  async MakeVehicleActive(vehicle_id, driver_id) {
    try {
      const driver = await this.model.drivers.findOne({ _id: driver_id });
      const update = await this.model.vehicle_detail.findOneAndUpdate(
        { _id: vehicle_id },
        { status: VehicleStatus.Requested },
        { new: true }, // This option returns the updated document
      );
      if (!update) {
        return { message: 'Vehicle not found' };
      }
      let add_history = {
        driver_id: driver_id,
        vehicle_detail_id: vehicle_id,
        description: 'Activate vehicle: ' + update.name + '.',

        created_at: Date.now(),
      };
      this.model.docsUpdateHistory.create(add_history);

      // Deactivate all other vehicles for the driver
      await this.model.vehicle_detail.updateMany(
        { _id: { $ne: vehicle_id }, driver_id: driver_id },
        { status: VehicleStatus.Deativate },
      );

      // Update the driver with the active vehicle's ID
      await this.model.drivers.updateOne(
        { _id: driver_id },
        {
          vehicle_type_id: update.vehicle_id,
          is_doc_update: true,
          is_approved: null,
          status: DriverStatus.Offline,
          updated_at: moment().valueOf(),
        },
      );
      if (driver.doc_expiry_type === 'docs_expired') {
        await this.model.drivers.updateOne(
          { _id: driver_id },
          { doc_expiry_type: 'licence_expired' },
        );
      } else if (driver.doc_expiry_type === 'vehicle_docs_expired') {
        await this.model.drivers.updateOne(
          { _id: driver_id },
          { doc_expiry_type: null },
        );
      }

      return { message: 'Vehicle activated successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async check_Expiry_date() {
    try {
      // const current_date = moment().startOf('day').valueOf();
      const current_date = moment()
        .startOf('day')
        .subtract(5, 'hour')
        .subtract(30, 'minute')
        .valueOf();
      const licence_expiry_date = await this.model.drivers.find({
        is_active: true,
        is_approved: true,
        is_doc_update: true
      });
      for (const data of licence_expiry_date) {
        const docs_expirydate = await this.model.vehicle_detail.findOne({
          driver_id: data._id,
          status: 'active',
        });
        if (
          current_date > data.licence_expiry_date ||
          current_date > docs_expirydate?.insurance_expiry_date ||
          current_date > docs_expirydate?.registration_expiry_date
        ) {
          await this.model.drivers.updateOne(
            { _id: data._id },
            {
              is_active: false,
              is_approved: false,
              status: DriverStatus.Offline,
              // licence_expiry_date: null,
            },
          );
          const session = await this.model.sessions.findOne({
            user_id: data._id,
          });
          if (session) {
            let push_data = {
              title: 'Account inactive Notice',
              message:
                'Your account has been inactive due to expired documents. Please update your documents to reactivate your account.',
            };
            let data = {
              type: 'document_expiration',
            };
            this.notification.send_notification(
              push_data,
              session.fcm_token,
              data,
            );
          }
          this.emailService.sent_docs_expire_email(data);
          if (
            current_date > data.licence_expiry_date &&
            current_date > docs_expirydate?.insurance_expiry_date &&
            current_date > docs_expirydate?.registration_expiry_date
          ) {
            await this.model.drivers.updateOne(
              { _id: data._id },
              { doc_expiry_type: 'docs_expired', licence_expiry_date: null },
            );

            await this.model.vehicle_detail.updateOne(
              {
                _id: docs_expirydate._id,
              },
              {
                insurance_expiry_date: null,
                registration_expiry_date: null,
              },
            );
          }

          else if (
            current_date > docs_expirydate?.insurance_expiry_date &&
            current_date > docs_expirydate?.registration_expiry_date
          ) {
            await this.model.drivers.updateOne(
              { _id: data._id },
              { doc_expiry_type: 'vehicle_docs_expired' },
            );
            await this.model.vehicle_detail.updateOne(
              {
                _id: docs_expirydate._id,
              },
              {
                insurance_expiry_date: null,
                registration_expiry_date: null,
              },
            );
          }
          else if (
            current_date > docs_expirydate?.insurance_expiry_date &&
            current_date > data.licence_expiry_date
          ) {
            await this.model.drivers.updateOne(
              { _id: data._id },
              {
                doc_expiry_type: 'licence_insurance_expired',
                licence_expiry_date: null,
              },
            );
            await this.model.vehicle_detail.updateOne(
              {
                _id: docs_expirydate._id,
              },
              {
                insurance_expiry_date: null,
                //  registration_expiry_date: null,
              },
            );
          }
          else if (
            current_date > docs_expirydate?.registration_expiry_date &&
            current_date > data.licence_expiry_date
          ) {
            await this.model.drivers.updateOne(
              { _id: data._id },
              {
                doc_expiry_type: 'licence_registration_expired',
                licence_expiry_date: null,
              },
            );
            await this.model.vehicle_detail.updateOne(
              {
                _id: docs_expirydate._id,
              },
              {
                // insurance_expiry_date: null,
                registration_expiry_date: null,
              },
            );
          }
          else if (current_date > docs_expirydate?.insurance_expiry_date) {
            await this.model.drivers.updateOne(
              { _id: data._id },
              { doc_expiry_type: 'insurance_expired' },
            );
            await this.model.vehicle_detail.updateOne(
              {
                _id: docs_expirydate._id,
              },
              {
                insurance_expiry_date: null,
              },
            );
          }
          else if (current_date > docs_expirydate?.registration_expiry_date) {
            await this.model.drivers.updateOne(
              { _id: data._id },
              { doc_expiry_type: 'registration_expired' },
            );

            await this.model.vehicle_detail.updateOne(
              {
                _id: docs_expirydate._id,
              },
              {
                registration_expiry_date: null,
              },
            );
          }

          else if (current_date >= data.licence_expiry_date) {
            await this.model.drivers.updateOne(
              { _id: data._id },
              {
                doc_expiry_type: 'licence_expired',
                licence_expiry_date: null,
              },
            );
          }
        }
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  // async sent_docs_expire_email(data) {
  //   try {
  //     const currentDir = __dirname;
  //     const cabAppDir = path.resolve(currentDir, '../../');
  //     console.log('hello', cabAppDir);

  //     let file_path = path.join(
  //       __dirname,
  //       '../../dist/email-template/docs-expired.hbs',
  //     );

  //     console.log('file_path', file_path);
  //     let html = fs.readFileSync(file_path, { encoding: 'utf-8' });

  //     // Compile the template

  //     const template = Handlebars.compile(html);
  //     const templatedata = {
  //       driverName: data.name,
  //     };
  //     const htmlToSend = template(templatedata);

  //     let mailData = {
  //       to: data.email,
  //       subject:
  //         'Action Required: Your TipTop Cabby Account is Inactive Due to Expired Documents',
  //       html: htmlToSend,
  //     };
  //     this.commonService.sendmail(
  //       mailData.to,
  //       mailData.subject,
  //       null,
  //       mailData.html,
  //     );
  //   } catch (error) {
  //     throw error;
  //   }
  // }
  async edit_licence(body, driver_id) {
    try {
      await this.model.drivers.updateOne(
        { _id: driver_id },
        {
          licence_back_image: body.licence_back_image,
          licence_front_image: body.licence_front_image,
          is_approved: null,
          is_doc_update: true,
        },
      );

      return { message: 'successfully update' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async DocUpdateHistory(driver_id, page, limit) {
    try {
      const driver_vehicle_history = await this.model.docsUpdateHistory
        .find({ driver_id: driver_id })
        .sort({ created_at: -1 }) // Sort by updatedAt field in descending order
        .skip((page - 1) * limit) // Skip documents for pagination
        .limit(limit)
        .populate({
          path: 'vehicle_detail_id',
          populate: {
            path: 'vehicle_id',
          },
        });

      const driver_vehicle_history_count = await this.model.docsUpdateHistory
        .countDocuments({ driver_id: driver_id })
        .sort({ created_at: -1 }) // Sort by updatedAt field in descending order
        .skip((page - 1) * limit) // Skip documents for pagination
        .limit(limit)
        .populate({
          path: 'vehicle_detail_id',
          populate: {
            path: 'vehicle_id',
          },
        });

      return {
        count: driver_vehicle_history_count,
        data: driver_vehicle_history,
      };
    } catch (error) {
      throw error;
    }
  }

  async GetOngoingBookings(driver_id) {
    try {
      let ongoingBookingExist = await this.model.booking.findOne({
        driver_id: driver_id,
        booking_status: BookingStatus.Accept,
      });
      if (ongoingBookingExist) {
        let customer = await this.model.customers.findOne({
          _id: ongoingBookingExist.customer_id,
        });
        const driver = await this.model.drivers.findOne(
          { _id: ongoingBookingExist.driver_id },
          { latitude: 1, longitude: 1, heading: 1 },
        );
        let data = {
          customer_socket_id: customer?.socket_id,
          driver: driver,
        };
        return data;
      }
    } catch (error) {
      throw error;
    }
  }

  async findDriversInSameCity(pick_up_lat: string, pick_up_long: string) {
    try {
      // Step 1: Reverse Geocode the pickup location to get the city name
      const pickupCity = await this.commonService.reverseGeocode(
        pick_up_lat,
        pick_up_long,
      );
      // Step 2: Find all active drivers
      const drivers = await this.model.drivers.find(
        {
          is_active: true,
          is_block: false,
          is_deleted: false,
          ride_status: 'free',
          status: 'online',
        },
        { latitude: 1, longitude: 1 },
      );

      const driversInSameCity = [];
      // Step 3: Loop through drivers and reverse geocode their lat-long
      for (const driver of drivers) {
        const driverCity = await this.commonService.reverseGeocode(
          driver.latitude,
          driver.longitude,
        );
        // Step 4: Compare the driver's city with the pickup city
        if (driverCity === pickupCity) {
          driversInSameCity.push(driver); // Save the driver if in the same city
        }
      }
      let no_of_drivers_available = driversInSameCity.length;
      return no_of_drivers_available;
    } catch (error) {
      console.error('Error finding drivers in the same city:', error);
      throw new HttpException(
        'Error finding drivers in the same city',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async driverPayoutList() {
    try {
      let amount_due_to_app = 0;
      let amount_due_to_driver = 0;
      let total_amount = 0;

      let driverData = [];
      const data = await this.model.payments.find();
      const uniqueDriverIds = new Set(
        data.map((fetchDriver) => fetchDriver.driver_id.toString()),
      );
      for (const driver of uniqueDriverIds) {
        let driver_data = await this.model.drivers.findOne({
          _id: driver,
        });
        const driver_online_payment = await this.model.payments.find({
          driver_id: driver,
          payment_type: Payment_type.Card,
        });
        const driver_cash_payment = await this.model.payments.find({
          driver_id: driver,
          payment_type: Payment_type.Cash,
        });
        for (const cash of driver_cash_payment) {
          amount_due_to_app = cash.commision_amount;
        }
        for (const online of driver_online_payment) {
          amount_due_to_driver = online.payout_amount;
        }
        total_amount = amount_due_to_driver - amount_due_to_app;
        driverData.push({
          driver_data,
          total_amount: total_amount,
        });
        return { data: driverData };
      }
    } catch (error) {
      throw error;
    }
  }

  async listOfDriverForChatByDispatcher(req: any, dto: DriverForChatByDispatcherDto) {
    try {
      const { pagination, limit, search } = dto;
      const options = await this.commonService.set_options(pagination, limit);

      const drivers: any = await this.model.drivers.aggregate([
        {
          $match: {
            vehicle_type_id: { $ne: null },
            is_block: false,
            is_deleted: false,
            is_active: true,
            is_approved: true,
            latitude: { $ne: null },
            longitude: { $ne: null },
            doc_expiry_type: null,
            ...(search && {
              $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
              ]
            }),
          }
        },
        {
          $project: {
            _id: 1,
            status: 1,
            name: 1,
            phone: 1,
            country_code: 1,
            email: 1,
            image: 1,
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
      console.error("listOfDriverForChatByDispatcher error:", error);
      throw error;
    }
  }


  async editCommision(body) {
    try {
      await this.model.drivers.updateOne({ _id: body.id }, { commission: body.commission })
      return {
        message: "successfully updated"
      }
    } catch (error) {
      throw error

    }
  }


}
