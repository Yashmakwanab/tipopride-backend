import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
import * as mongosse from 'mongoose';
export enum BookingStatus {
  Request = 'request',
  Ongoing = 'ongoing',
  Completed = 'completed',
  Accept = 'accepted',
  Cancelled = 'cancelled',
  Failed = "failed"
}

export enum BookingType {
  Current = 'current',
  Schedule = 'schedule',
  Scheduled_draft = 'scheduled_draft',
}

export enum RequestType {
  Parcel = 'parcel',
  Ride = 'ride',
}

export enum RideStatus {
  AtPickup = 'reached_at_pickup',
  RideStart = 'start_ride',
  Atdestination = 'reached_at_stop_1',
  RideCompleted = 'started_from_Stop_1',
  reached_at_stop_2 = 'reached_at_stop_2',
  started_from_Stop_2 = 'started_from_Stop_2'
}

export enum BookingCreatedBy {
  DISPATCHER = 'DISPATCHER',
  CUSTOMER = 'CUSTOMER',
}

export enum PayToDriver {
  Paid = 'paid',
  UnPaid = 'unpaid',
}

@Schema()
export class Booking {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Customers' }) // Add reference to Vehicle schema
  customer_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Company' }) // Add reference to Vehicle schema
  company_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Admin' })
  dispatcher_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Admin' })
  assigned_by: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Drivers', default: null }) // Add reference to Vehicle schema
  driver_id: string;

  @Prop({ default: null })
  booking_id: string;

  @Prop({ enum: RequestType, default: RequestType.Ride })
  request_type: RequestType;

  @Prop({ default: null })
  sender_name: string;

  @Prop({ default: null })
  sender_country_code: string;

  @Prop({ default: null })
  sender_number: string;

  @Prop({ default: null })
  receiver_name: string;

  @Prop({ default: null })
  receiver_country_code: string;

  @Prop({ default: null })
  receiver_number: string;

  @Prop({ default: null })
  parcel_details: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Coupons' }) // Add reference to Vehicle schema
  coupon_id: string;
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Connections' })
  connection_driver: string
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Connections' })
  connection_customer: string
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Vehicle_types' }) // Add reference to Vehicle schema
  vehicle_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Vehicle_details' }) // Add reference to Vehicle schema
  vehicleDetail_id: string;

  @Prop({ default: false })
  payment_confirmed: boolean;

  @Prop({ default: false })
  payment_success: boolean;

  @Prop({ default: false })
  is_guest: boolean;


  @Prop({ default: null })
  intent_id: string;

  @Prop({ default: false })
  payment_received: boolean;

  @Prop({ default: null })
  pickup_address: string;

  @Prop({ default: null })
  drop_address: string;

  @Prop({ default: null })
  flight_number: string;

  @Prop({ default: null })
  notes: string;

  @Prop({ default: null })
  pickup_lat: string;

  @Prop({ default: null })
  pickup_long: string;

  @Prop({ default: null })
  drop_lat: string;

  @Prop({ default: null })
  drop_long: string;

  @Prop({ type: [{ name: String, lat: String, long: String }], default: null })
  stops: {
    name: string;
    lat: String;
    long: String;
  }[];

  @Prop({ default: 0 })
  pending_booking_amount: number;


  @Prop({ default: 0 })
  base_fee_without_addon: number

  @Prop({ default: null })
  arrived_at_stop_1: number;

  @Prop({ default: null })
  started_from_stop_1: number;

  @Prop({ default: null })
  arrived_at_stop_2: number;

  @Prop({ default: null })
  started_from_stop_2: number;

  @Prop({ default: null })
  arrived_pickup_loc_at: number;

  @Prop({ default: null })
  schedule_date: number;

  @Prop({ type: String, enum: BookingStatus, default: null })
  booking_status: string;

  @Prop({ type: String, enum: BookingType, default: 'current' })
  booking_type: string;

  @Prop({ type: String, enum: RideStatus, default: null })
  ride_status: string;

  @Prop({ default: null })
  cancelled_reason: string;

  @Prop({ default: false })
  is_ride_started: boolean;

  @Prop({ default: false })
  sent_dispatch_noti: boolean;

  @Prop({ default: null })
  cancelled_by: string;

  @Prop({ type: [mongosse.Schema.Types.ObjectId], ref: 'Drivers', default: [] }) // Changed to an array
  cancelled_driver_ids: mongosse.Schema.Types.ObjectId[];

  @Prop({ default: null })
  payment_method: string;

  @Prop({ default: null })
  payment_status: string;

  @Prop({ default: null })
  distance_in_km: number;

  @Prop({ default: null })
  base_fee: number;

  @Prop({ default: null })
  base_fee_with_discount: number;

  @Prop({ default: null })
  stop_charges: number;

  @Prop({ default: null })
  surcharge_amount: number;

  @Prop({ default: null })
  toll_price: number;

  @Prop({ default: null })
  tip_driver: number;

  @Prop({ default: null })
  gst: number;

  @Prop({ default: null })
  coupon_discount: number;

  @Prop({ default: null })
  total_amount: number;

  @Prop({ default: null })
  total_trip_amount: number;

  @Prop({ default: null })
  ride_otp: number;

  @Prop({ default: null })
  child_seat_charge: number;

  @Prop({ default: null })
  wheel_chair_charge: number;

  @Prop({ default: null })
  waiting_charge_per_min: number;

  @Prop({ default: false })
  is_waiting_charge_noti_send: boolean;

  @Prop({ default: false })
  is_stop1_charge_noti_send: boolean;

  @Prop({ default: false })
  is_broadcast: boolean;

  @Prop({ default: false })
  is_broadcast_7_km: boolean;

  @Prop({ default: false })
  is_stop2_charge_noti_send: boolean;

  @Prop({ default: false })
  is_satteled: boolean;

  @Prop({ default: false })
  rate_by_customer: boolean;

  @Prop({ default: false })
  rate_by_driver: boolean;

  @Prop({ default: false })
  is_dispatcher_notified: boolean;


  @Prop({ default: null })
  extimated_delivery_time: string;

  @Prop({ default: null })
  near_by_airport_charges: number;

  @Prop({ default: null })
  accept_ride_at: number;

  @Prop({ default: null })
  child_capsule_charge: number

  @Prop({ default: null })
  start_ride_at: number;

  @Prop({ default: 0 })
  last_stop_charges_mins: number;

  @Prop({ default: 0 })
  last_stop2_charges_mins: number;

  @Prop({ default: 0 })
  last_start_ride_charges_mins: number;

  @Prop({ default: null })
  complete_delivery_at: number;

  @Prop({ type: [String], default: null })
  filter: string[];

  @Prop({ default: 0 })
  luggage: number;

  @Prop({ default: 0 })
  handbags: number;

  @Prop({ default: 0 })
  passenger: number;

  @Prop({ default: 0 })
  refund_amount: number;

  @Prop({ default: 0 })
  pay_by_customer: number;

  @Prop({ default: 0 })
  pay_to_customer: number;

  @Prop({ default: 0 })
  refund_initiate: number;

  @Prop({ default: 0 })
  no_of_wheelchair: number

  @Prop({ default: 0 })
  no_of_childseat: number

  @Prop({ default: 0 })
  no_of_childcapsule: number

  @Prop({ type: Boolean, default: false })
  include_airport_toll: boolean

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;

  @Prop({ type: String, default: null })
  invoice_number: string

  @Prop({ type: String, default: null })
  transaction_number: string

  @Prop({ type: Number, default: 0 })
  airport_toll: number

  @Prop({ type: Number, default: 0 })
  gov_levy: number

  @Prop({ type: Number, default: 0 })
  amount_for_driver: number

  @Prop({ type: Number, default: 0 })
  app_earning: number

  @Prop({
    type: {
      name: { type: String },
      number: { type: String },
      notes_for_driver: { type: String },
      country_code: { type: String },
    },
  })
  company_passenger: {
    name: string;
    number: string;
    notes_for_driver?: string;
    country_code?: string;
  };

  @Prop({ enum: PayToDriver, default: PayToDriver.UnPaid })
  pay_to_driver: PayToDriver;


  @Prop({ type: [mongosse.Schema.Types.ObjectId], ref: 'Drivers', default: [] }) // Changed to an array
  broadcasted_driver_ids: mongosse.Schema.Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  is_currently_broadcasting: boolean
}

export type BookingDocment = HydratedDocument<Booking>;
export const BookingModel = SchemaFactory.createForClass(Booking);
