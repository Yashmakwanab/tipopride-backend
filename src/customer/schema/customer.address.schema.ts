import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import * as mongosse from 'mongoose';
import { HydratedDocument } from 'mongoose';
enum AddressType {
    Home = 'home',
    Work = 'work'
}
@Schema()
export class Customer_Address {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Customer' }) // Add reference to Vehicle schema
  customer_id: string;

  @Prop({ default: null })
  name: string;

  @Prop({ default: null })
  lat: string;

  @Prop({ default: null })
  long: string;

  @Prop({ type: String, enum: AddressType })
  type: string;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type Customer_AddressDocment = HydratedDocument<Customer_Address>;
export const Customer_AddressModel = SchemaFactory.createForClass(Customer_Address);
