import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';

import * as mongosse from 'mongoose';
export enum Status{
  Paid='paid',
  Unpaid='unpaid'
}
@Schema()
export class DriverPayoutHistory {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Driver' }) // Add reference to Vehicle schema
  driver_id: string;

  @Prop({ default: 0 })
  week_start: number;

  @Prop({ default: 0 })
  week_end: number;

  @Prop({ default: 0 })
  amount_due_to_driver: number;

  @Prop({ default: 0 })
  amount_due_to_app: number;

  @Prop({ default: 0 })
  amount: number;

  @Prop({enum:Status, default: Status.Unpaid })
  status: Status;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type DriverPayoutHistoryDocument = HydratedDocument<DriverPayoutHistory>;
export const DriverPayoutHistoryModel = SchemaFactory.createForClass(DriverPayoutHistory);
