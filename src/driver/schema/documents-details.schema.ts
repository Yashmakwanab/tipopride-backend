import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';

import * as mongosse from 'mongoose';
@Schema()
export class DocumentsDetails {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Driver' }) // Add reference to Vehicle schema
  driver_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Vehicle_details' }) // Add reference to Vehicle schema
  vehicle_detail_id: string;

  // @Prop({ default: null })
  // licence_front_image: string;

  // @Prop({ default: null })
  // licence_back_image: string;

  // @Prop({ default: null })
  // licence_expiry_date: number;


  @Prop({ default: null })
  vehicle_registration_image: string;

  @Prop({ default: null })
  vehicle_insurance_image: string;

  @Prop({ default: null })
  insurance_expiry_date: number;

  @Prop({ default: null })
  registration_expiry_date: number;

  @Prop({ default: "active" })
  status: string;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type DocumentsDetailsDocment = HydratedDocument<DocumentsDetails>;
export const DocumentsDetailsModel = SchemaFactory.createForClass(DocumentsDetails);
