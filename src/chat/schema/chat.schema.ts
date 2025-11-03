import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
enum sent_by {
  Customer = 'customer',
  Driver = 'driver',
  Staff = 'staff',
}

export enum chat_type {
  support = 'support',
  booking = 'booking'
}
@Schema()
export class Chats {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Connections' }) // Add reference to Connections schema
  connection_id: string;

  // @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Drivers' }) // Add reference to Drivers schema
  // driver_id: string;

  // @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Customers' }) // Add reference to Customers schema
  // customer_id: string;

  // @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Admin' }) // Add reference to Admin schema
  // dispatcher_id: string

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Booking' }) // Add reference to Booking schema
  booking_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId }) // Add reference to Booking schema
  receiver: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId }) // Add reference to Booking schema
  sender: string;

  @Prop({ enum: sent_by, default: sent_by.Customer })
  sent_by: string;

  @Prop({ enum: chat_type, default: chat_type.booking })
  chat_type: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ default: false })
  is_deleted: boolean;

  @Prop({ default: null })
  message: string;

  @Prop({ default: +new Date() })
  updated_at: number;

  @Prop({ default: +new Date() })
  created_at: number;
}
export type ChatsDocment = HydratedDocument<Chats>;
export const ChatsModel = SchemaFactory.createForClass(Chats);