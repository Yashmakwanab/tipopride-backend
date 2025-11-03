import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongosse from 'mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';
enum PaymentStatus {
    Pending="pending",
    Completed = 'completed',
    Failed = 'failed',
  }
  enum payout_to_driver {
    Pending="pending",
    Completed = 'completed',
   
  }

  enum Payment_type {
    Cash="cash",
    Card="card",
    Wallet = 'wallet',
   
  }
  @Schema()
export class Tax {
 
  @Prop({ default: null })
  amount: number;

  @Prop({ default: null })
  date: string;

  
  @Prop({ default: null })
  time: string;

  

  


  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}
export type TaxDocment = HydratedDocument<Tax>;
export const TaxModel = SchemaFactory.createForClass(Tax);
