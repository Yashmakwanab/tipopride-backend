import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
import * as mongosse from 'mongoose';
import { UsersType } from 'src/auth/role/user.role';
// import { UsersType } from "../roles/role";
export enum DriverStatus {
  Online = 'online',
  Offline = 'offline',
}

// export enum DriverStatus {
//   Online = 'online',
//   Offline = 'offline',
// }
export enum ride_status {
  busy = 'busy',
  free = 'free',
}
@Schema()
export class Drivers {
  @Prop({ type: String, default: null })
  name: string;

  @Prop({ type: String, default: null })
  email: string;

  @Prop({ type: String, default: null })
  country_code: string;


  @Prop({ type: Number, default: null })
  commission: number;

  @Prop({ type: mongosse.Schema.Types.ObjectId }) // Add reference to Vehicle schema
  vehicle_type_id: string;


  @Prop({ type: String, default: null })
  phone: string;

  @Prop({ type: String, default: null })
  image: string;

  @Prop({ type: String, default: null })
  latitude: string;

  @Prop({ default: UsersType.Driver })
  user_type: string;

  @Prop({ type: String, default: null })
  longitude: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [0, 0],
    },
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop({ type: String, default: null })
  temp_email: string;

  @Prop({ type: String, default: null })
  temp_phone: string;

  @Prop({ type: String, default: null })
  temp_country_code: string;

  @Prop({ type: Number, default: null })
  temp_email_otp: number;

  @Prop({ type: Number, default: null })
  temp_phone_otp: number;

  @Prop({ type: Number, default: null })
  temp_email_otp_at: number;

  @Prop({ type: Number, default: null })
  temp_phone_otp_at: number;

  @Prop({ type: Boolean, default: false })
  is_bank_added: boolean;


  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: Boolean, default: false })
  is_block: boolean;

  @Prop({ type: Boolean, default: null })
  is_approved: boolean;

  @Prop({ type: Boolean, default: false })
  is_doc_update: boolean;

  @Prop({ default: null })
  approved_on: number;

  @Prop({ default: null })
  reject_on: number;

  @Prop({ default: null })
  reject_reason: string;

  @Prop({ type: Boolean, default: false })
  is_email_verify: boolean;

  @Prop({ type: Boolean, default: false })
  is_phone_verify: boolean;

  @Prop({ type: String, enum: DriverStatus, default: DriverStatus.Offline })
  status: string;

  @Prop({ type: String, enum: ride_status, default: ride_status.free })
  ride_status: string;

  @Prop({ type: String, default: null })
  device_type: string;

  @Prop({ type: String, default: "english" })
  preferred_language: string;

  @Prop({ type: String, default: "AUD" })
  preferred_currency: string;

  @Prop({ type: String, default: "$" })
  currency_symbol: string;

  @Prop({ default: 0 })
  pending_submit_cash: number;

  @Prop({ default: null })
  pending_submit_cash_upated_at: number;

  @Prop({ type: String, default: null })
  customer_id: string

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Booking' }) // Add reference to Vehicle schema
  current_booking: string;

  @Prop({ default: 0 })
  ratings: number;

  @Prop({ default: null })
  socket_id: string;

  @Prop({ default: false })
  currently_send_ride_request: boolean;



  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Booking' }) // Add reference to Vehicle schema
  currently_send_ride_request_id: string;

  @Prop({ default: null })
  currently_send_ride_request_generate_at: number;


  @Prop({ default: null })
  heading: string;

  @Prop({ default: false })
  set_up_profile: boolean;

  @Prop({ default: false })
  set_up_vehicle: boolean;

  @Prop({ default: false })
  set_up_documents: boolean;

  @Prop({ default: null })
  police_check: string;

  @Prop({ default: null })
  network_name: string;

  @Prop({ default: null })
  abn_number: string;

  @Prop({ default: null })
  licence_front_image: string;

  @Prop({ default: null })
  licence_back_image: string;

  @Prop({ default: null })
  licence_expiry_date: number;

  @Prop({ default: null })
  block_reason: string;

  @Prop({ default: null })
  doc_expiry_type: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: "Connections", default: null })
  connection_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: "Connections", default: null })
  support_connection: string

  @Prop({ default: false })
  is_deleted: boolean;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}

export type DriversDocment = HydratedDocument<Drivers>;
export const DriversModel = SchemaFactory.createForClass(Drivers);
DriversModel.index({ location: '2dsphere' });
