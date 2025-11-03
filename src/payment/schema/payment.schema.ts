import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
enum PaymentStatus {
  Pending = "pending",
  Completed = 'completed',
  Failed = 'failed'
}
enum payout_to_driver {
  Pending = "pending",
  Completed = 'completed',

}

export enum Payment_type {
  Cash = "cash",
  Card = "card",
  Wallet = 'wallet',

}
@Schema()
export class Payments {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Customers' }) // Add reference to Vehicle schema
  customer_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Drivers' }) // Add reference to Vehicle schema
  driver_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Booking' }) // Add reference to Vehicle schema
  booking_id: string;

  @Prop({ default: null })
  amount: number;

  @Prop({ default: null })
  tax: number;

  @Prop({ default: null })
  payout_amount: number;

  @Prop({ default: null })
  commision_amount: number;

  @Prop({ default: false })
  is_refund: boolean;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.Pending })
  status: string;

  @Prop({ enum: Payment_type, default: Payment_type.Card })
  payment_type: string;

  @Prop({ enum: payout_to_driver, default: payout_to_driver.Pending })
  payout_to_driver: string;

  @Prop({ type: Number, default: null })
  payout_initiated: number;

  @Prop({ default: null })
  pending_amount_pay_on: number;

  @Prop({ default: null })
  pending_amount_status: string;


  @Prop({ default: null })
  payout_id: string;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type PaymentsDocment = HydratedDocument<Payments>;
export const PaymentsModel = SchemaFactory.createForClass(Payments);
