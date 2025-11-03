/**
 * Schema for Activities
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as moment from 'moment';

export type ActitvityDocument = Activity & Document;
@Schema({ timestamps: true })
export class Activity {

    @Prop()
    userId: string;

    @Prop()
    action: string;

    @Prop()
    resource: string;

    @Prop()
    description: string;

    @Prop({ type: Object })
    payload?: any;

    @Prop({ default: [] })
    requestdata?: [];

    @Prop({ default: null })
    booking_id: string;

    // @Prop({ type: Number, default: moment().utc().valueOf() })
    // created_at: number;
    
    // @Prop({ type: Number, default: null })
    // updated_at: number;

}
export const ActivityModel = SchemaFactory.createForClass(Activity);