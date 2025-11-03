import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
@Schema()
export class Pages{
    
    @Prop({default:null})
    title_slug:string

    @Prop({default:null})
    title:string

    @Prop({default:null})
    description:string

    @Prop({default:null})
    type:string

    @Prop({ type: Number, default: moment().utc().valueOf() })
    created_at: number;
  
    @Prop({ type: Number, default: null })
    updated_at: number;
  }
  
  export type PagesDocument = HydratedDocument<Pages>;
  export const PagesModel = SchemaFactory.createForClass(Pages);
  