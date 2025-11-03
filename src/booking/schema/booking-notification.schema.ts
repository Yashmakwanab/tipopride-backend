import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
@Schema()
export class Booking_notifications {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Bookings' }) // Add reference to Vehicle schema
  booking_id: string;

  @Prop({ type: [String], ref: 'Drivers', default: [] }) // Array of strings with reference to 'Drivers'
  driver_ids: string[]; // Use plural to indicate an array

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;

}
export type Booking_notificationsDocment = HydratedDocument<Booking_notifications>;
export const Booking_notificationsModel = SchemaFactory.createForClass(Booking_notifications);
