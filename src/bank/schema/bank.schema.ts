import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as moment from "moment";
import mongoose, { HydratedDocument } from "mongoose";

class Address {
    @Prop({ type: String, required: true })
    city: string;
  
    @Prop({ type: String, required: true })
    postal_code: string;
  
    @Prop({ type: String, required: true })
    line1: string;
  
    @Prop({ type: String, required: true })
    state: string;
  }
@Schema()
export class Banks {
    @Prop({type: mongoose.Schema.Types.ObjectId,ref: 'Drivers'})
    driver_id: string

    @Prop({type:String, default: null})
    first_name: string

    @Prop({type:String, default: null})
    last_name: string

    @Prop({ type: Address })
    address: Address;

    @Prop({type:String, default: null})
    country_code: string

    
    @Prop({type:String, default: null})
    phone: string


    @Prop({type:String, default: null})
    country: string

    @Prop({type:String, default: null})
    currency: string

    @Prop({type:String, default: null})
    bsb_number: string

    @Prop({type:String, default: null})
    tax_file_number: string

    @Prop({type:String, default: null})
    account_number: string

    @Prop({type:String,default:null})
    customer: string

    @Prop({type:String,default:null})
    account_id: string

    @Prop({type:String,default:null})
    date_of_birth: string


    @Prop({type:String,default:null})
    file: string

    @Prop({type:String,default:null})
    file_path: string


    @Prop({type: Number,default:moment().utc().valueOf()})
    created_at: number

    @Prop({type: Number,default:null})
    updated_at: number
}

export type BanksDocument = HydratedDocument<Banks>
export const BanksModel = SchemaFactory.createForClass(Banks)