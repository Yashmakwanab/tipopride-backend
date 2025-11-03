import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
import { chat_type } from './chat.schema';
enum sent_by {
  Customer = 'customer',
  Driver = 'driver',
}
@Schema()
export class Connections {
  // @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Drivers' }) // Add reference to Vehicle schema
  // driver_id: string;

  @Prop({ enum: chat_type, default: chat_type.support })
  chat_type: string;

  @Prop({ type: Boolean, default: false }) // Add reference to Vehicle schema
  is_exit_chat: boolean;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Booking' }) // Add reference to Vehicle schema
  booking_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId }) // Add reference to Booking schema
  receiver: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId }) // Add reference to Booking schema
  sender: string;

  @Prop({ default: null })
  last_message: string;

  @Prop({ default: null })
  initiated_by: string;

  @Prop({ default: +new Date() })
  updated_at: number;

  @Prop({ default: +new Date() })
  created_at: number;
}
export type ConnectionsDocment = HydratedDocument<Connections>;
export const ConnectionsModel = SchemaFactory.createForClass(Connections);