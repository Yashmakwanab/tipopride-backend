import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
@Schema()
export class Complaints {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Bookings' }) // Add reference to Vehicle schema
  booking_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId }) // Add reference to Vehicle schema
  user_id: string;

  @Prop({ default: null })
  posted_by: string;

  @Prop({  default: null })
  image: string;

  @Prop({ default: null })
  title: string;
  @Prop({ default: null })
  message: string;

  @Prop({ default: null })
  reply: string;

  @Prop({ default: null })
  reply_at: number;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}

export type ComplaintsDocument = HydratedDocument<Complaints>;
export const ComplaintsModel = SchemaFactory.createForClass(Complaints);
