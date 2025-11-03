import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Wallets {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Customers' }) // Add reference to Vehicle schema
  customer_id: string;

  @Prop({
    type: mongosse.Schema.Types.ObjectId,
    default: null,
    ref: 'Booking',
  }) 
  booking_id: string;

  @Prop({ default: null })
  amount: number;

  @Prop({ default: null })
  status: string;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type WalletsDocment = HydratedDocument<Wallets>;
export const WalletsModel = SchemaFactory.createForClass(Wallets);
