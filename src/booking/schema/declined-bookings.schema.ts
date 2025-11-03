import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Declined_bookings {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Bookings' }) // Add reference to Vehicle schema
  booking_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Drivers' }) // Add reference to Vehicle schema
  driver_id: string;

  @Prop({ default: null }) // Add reference to Vehicle schema
  status: string;


  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type Declined_bookingsDocment = HydratedDocument<Declined_bookings>;
export const Declined_bookingsModel = SchemaFactory.createForClass(Declined_bookings);
