import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Company {
  @Prop({ defaul:null }) // Add reference to Vehicle schema
  name: string;

  @Prop({ defaul:null}) // Add reference to Vehicle schema
  email: string;

  @Prop({ default: null })
  country_code: string;

  @Prop({ defaul:null })
  phone_no: string;

  @Prop({ default: +new Date() })
  created_at: number;
}
export type CompanyDocment = HydratedDocument<Company>;
export const CompanyModel =SchemaFactory.createForClass(Company);