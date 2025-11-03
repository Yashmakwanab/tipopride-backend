import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
@Schema()
export class Cards {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Customers' }) // Add reference to Vehicle schema
  customer_id: string;

  @Prop({ default: null })
  payment_method_id: string;

  @Prop({ default: null })
  card_no: string;

  @Prop({ default: null })
  card_holder_name: string;

  @Prop({ default: null })
  expiry_date: string;

  @Prop({ default: null })
  cvv: string;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type CardsDocment = HydratedDocument<Cards>;
export const CardsModel = SchemaFactory.createForClass(Cards);
