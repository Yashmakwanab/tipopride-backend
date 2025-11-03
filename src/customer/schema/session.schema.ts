import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as moment from "moment";
import { HydratedDocument } from "mongoose";
import * as mongosse from 'mongoose';


export enum DeviceType {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web'
}

@Schema()
export class Sessions {
    @Prop({ type: mongosse.Schema.Types.ObjectId }) // Add reference to Vehicle schema
    user_id: string;

    @Prop({ type: String, default: null })
    scope: String

    @Prop({ type: String, default: null })
    token: String

    @Prop({ type: String, default: null })
    fcm_token: String

    @Prop({ type: String, enum: DeviceType, default: DeviceType.ANDROID })
    device_type: DeviceType;

    @Prop({ type: Number, default: moment().utc().valueOf() })
    created_at: number

    @Prop({ type: Number, default: null })
    updated_at: number

}
export type SessionsDocment = HydratedDocument<Sessions>;
export const SessionsModel = SchemaFactory.createForClass(Sessions);
