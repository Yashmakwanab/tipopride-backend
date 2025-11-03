import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
@Schema()
export class Faqs {
  @Prop({ default: null })
  question: string;

  @Prop({ default: null })
  answer: string;

  @Prop({ default: null })
  type: string;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}

export type FaqsDocment = HydratedDocument<Faqs>;
export const FaqsModel = SchemaFactory.createForClass(Faqs);
