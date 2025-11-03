import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
import * as mongosse from 'mongoose';

@Schema()
export class SurchargeHistory {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Vehicle_types' }) // Add reference to Vehicle schema
  vehicle_id: string;

  @Prop({ default: null })
  start_time: string;

  @Prop({ default: null })
  end_time: string;


  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}

export type SurchargeHistoryDocment = HydratedDocument<SurchargeHistory>;
export const SurchargeHistoryModel = SchemaFactory.createForClass(SurchargeHistory);
