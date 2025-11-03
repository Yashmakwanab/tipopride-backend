import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';

export enum VehicleStatus {
  Active = 'active',
  Deativate = 'deactivate',
  Requested = "requested"
}
@Schema()
export class Vehicle_details {
  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Drivers' }) // Add reference to Vehicle schema
  driver_id: string;

  @Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Vehicle_types' }) // Add reference to Vehicle schema
  vehicle_id: string;

  @Prop({ default: null })
  name: string;

  @Prop({ default: null })
  model: string;

  @Prop({ default: null })
  number: string;

  @Prop({ default: null })
  no_of_seat: number;

  @Prop({ default: null })
  color: string;

  @Prop({ default: null })
  vehicle_photo: string;

  @Prop({ default: false })
  child_seat_availabilty: boolean;

  @Prop({ default: false })
  wheel_chair_availabilty: boolean;

  @Prop({ default: false })
  child_capsule_availabilty: boolean

  @Prop({ default: null })
  vehicle_registration_image: string;

  @Prop({ default: null })
  vehicle_insurance_image: string;

  @Prop({ default: null })
  no_of_childseat: number;

  @Prop({ default: null })
  no_of_wheelchair: number;

  @Prop({ default: null })
  no_of_childcapsule: number;

  @Prop({ default: null })
  insurance_expiry_date: number;

  @Prop({ default: null })
  registration_expiry_date: number;

  @Prop({ type: String, enum: VehicleStatus, default: VehicleStatus.Active })
  status: string;

  @Prop({ type: Number, default: null })
  approved_on: number;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type Vehicle_detailsDocment = HydratedDocument<Vehicle_details>;
export const Vehicle_detailsModel = SchemaFactory.createForClass(Vehicle_details);
