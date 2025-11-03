import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
import * as mongosse from 'mongoose';
enum surchargeType {
    DateTime = 'date_time',
    DriverAvailabilty = 'driver_availabilty',
  }
  
@Schema()
export class SurchargeDates{
@Prop({default:null})
date:number

@Prop({default:null})
start_time:string

@Prop({default:null})
end_time:string

@Prop({enum:surchargeType,default:surchargeType.DateTime})
type:string

@Prop({default:null})
no_of_driver:number

@Prop({ type: mongosse.Schema.Types.ObjectId, ref: 'Vehicle_types' }) // Add reference to Vehicle schema
vehicle_id: string;

@Prop({ type: Number, default: moment().utc().valueOf() })
created_at: number;

@Prop({ type: Number, default: null })
updated_at: number;
}

export type SurchargeDatesDocment = HydratedDocument<SurchargeDates>;
export const SurchargeDatesModel = SchemaFactory.createForClass(SurchargeDates);


