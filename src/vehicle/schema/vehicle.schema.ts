import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import * as mongosse from 'mongoose';

import { HydratedDocument } from 'mongoose';
@Schema()
class PriceRange {
  @Prop()
  min_range: number

  @Prop()
  max_range: number

  @Prop()
  price: number
}
type PriceRangeDocument = mongosse.HydratedArraySubdocument<PriceRange>
const PriceRangeModel = SchemaFactory.createForClass(PriceRange)
@Schema()
export class VehiclesPrices {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Vehicle_types' }) // Add reference to Vehicle schema
  vehicle_id: string;

  @Prop({ default: null })
  commission_percentage: Number;

  @Prop({ type: [PriceRange], default: null })
  distance_price: [];

  @Prop({ default: null })
  base_fare: Number;

  @Prop({ default: null })
  surcharge_price: Number;

  @Prop({ default: "12" })
  gst_percentage: string;

  @Prop({ default: null })
  no_of_seat: Number;

  @Prop({ default: null })
  stop_charges: Number;

  @Prop({ default: null })
  child_seat_charges: number;

  @Prop({ default: null })
  wheel_chair_charges: number;

  @Prop({ default: null })
  passenger: number;

  @Prop({ default: null })
  luggage: number;

  @Prop({ default: null })
  handbags: number;

  @Prop({ default: null })
  child_capsule_charges: number

  @Prop({ default: true })
  is_active: boolean;


  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type VehiclesPricesDocment = HydratedDocument<VehiclesPrices>;
export const VehiclesPricesModel = SchemaFactory.createForClass(VehiclesPrices);
