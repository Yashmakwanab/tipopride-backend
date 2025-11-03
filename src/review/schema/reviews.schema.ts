import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
enum Type {
  Customer = 'customer',
  Driver = 'driver',
}
@Schema()
export class Reviews {

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Bookings' }) // Add reference to Vehicle schema
    booking_id: string;
  
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Drivers' }) // Add reference to Vehicle schema
  driver_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Customers' }) // Add reference to Vehicle schema
  customer_id: string;

  @Prop({ default: null })
  rate: number;

  @Prop({ default: null })
  description: string;

  @Prop({ type: String, enum: Type, default: Type.Customer })
  type: string;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type ReviewsDocment = HydratedDocument<Reviews>;
export const ReviewsModel = SchemaFactory.createForClass(Reviews);
