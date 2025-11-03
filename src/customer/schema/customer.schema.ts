import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
// import { UsersType } from "../roles/role";
import * as mongosse from 'mongoose';
import { UsersType } from 'src/auth/role/user.role';
@Schema()
export class Customers {
  @Prop({ type: String, default: null })
  name: string;

  @Prop({ type: String, default: null })
  email: string;

  @Prop({ type: String, default: null })
  country_code: string;

  @Prop({ type: String, default: null })
  phone: string;

  @Prop({ type: String, default: null })
  image: string;
  @Prop({ type: String, default: null })
  sos_country_code: string;

  @Prop({ type: String, default: null })
  sos_contact: string;

  @Prop({ type: String, default: null })
  block_reason: string;

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

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Booking' }) // Add reference to Vehicle schema
  current_booking: string;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;


  @Prop({ type: Boolean, default: false })
  is_block: boolean;

  @Prop({ type: Boolean, default: false })
  is_email_verify: boolean;

  @Prop({ type: Boolean, default: false })
  is_phone_verify: boolean;

  @Prop({ default: null })
  pending_pay_amount: number;

  @Prop({ default: null })
  wallet_balance: number;

  @Prop({ type: String, default: null })
  customer_id: string

  @Prop({ type: String, default: null })
  device_type: string;

  @Prop({ type: String, default: null })
  login_type: string;

  @Prop({ default: false })
  is_card_added: boolean;

  @Prop({ type: String, default: "AUD" })
  preferred_currency: string;

  @Prop({ type: String, default: "english" })
  preferred_language: string;

  @Prop({ type: String, default: "$" })
  currency_symbol: string;

  @Prop({ default: 0 })
  ratings: number;

  @Prop({ default: null })
  socket_id: string;
  @Prop({ default: UsersType.Customer })
  user_type: string;
  @Prop({ default: false })
  is_deleted: boolean;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: "Connections", default: null })
  connection_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: "Connections", default: null })
  support_connection: string

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}

export type CustomersDocment = HydratedDocument<Customers>;
export const CustomersModel = SchemaFactory.createForClass(Customers);
