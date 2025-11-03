import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';

import * as mongosse from 'mongoose';
@Schema()
export class DocsUpdateHistory {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Driver' }) // Add reference to Vehicle schema
  driver_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Vehicle_details' }) // Add reference to Vehicle schema
  vehicle_detail_id: string;

  @Prop({ default: null })
  description: string;

  @Prop({ default: "pending" })
  status: string;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type DocsUpdateHistoryDocment = HydratedDocument<DocsUpdateHistory>;
export const DocsUpdateHistoryModel = SchemaFactory.createForClass(DocsUpdateHistory);
