import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class IpAddress {
  @Prop()
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ default: () => new Date() })
  date_entered: Date;

  @Prop({ required: true })
  created_by: string;

  @Prop()
  updated_by?: string;
}

export type IpAddressDocment = HydratedDocument<IpAddress>;
export const IpAddressModel =SchemaFactory.createForClass(IpAddress);
