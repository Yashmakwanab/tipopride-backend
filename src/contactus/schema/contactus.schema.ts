import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
@Schema()
export class Contactus {
  @Prop({ type: mongosse.Schema.Types.ObjectId }) // Add reference to Vehicle schema
  user_id: string;

  @Prop({ default: null })
  name: string;

  @Prop({ default: null })
  email: string;

  @Prop({ default: null })
  posted_by: string;

  @Prop({ default: null })
  message: string;

  @Prop({ default: null })
  reply: string;

  @Prop({ default: null })
  reply_at: number;


  @Prop({ default: false })
  is_deleted: boolean;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type ContactusDocument = HydratedDocument<Contactus>;
export const ContactusModel = SchemaFactory.createForClass(Contactus);