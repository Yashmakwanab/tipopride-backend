import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
@Schema()
export class DriverEarnings {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Booking' }) // Add reference to Vehicle schema
  booking_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Drivers' }) // Add reference to Vehicle schema
  driver_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Customers' }) // Add reference to Vehicle schema
  customer_id: string;

  @Prop({ default: 0 })
  booking_amount: number;

  @Prop({ default: 0 })
  amount: number;

  @Prop({ default: 0 })
  admin_comission_amount: number;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type DriverEarningsDocment = HydratedDocument<DriverEarnings>;
export const DriverEarningsModel = SchemaFactory.createForClass(DriverEarnings);
