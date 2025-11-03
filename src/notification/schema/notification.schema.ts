import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import * as moment from 'moment';

export enum NotifyFor {
    Booking = "booking",
    chat = "chat",
}

export const NotificationSchema = 'Notification'
@Schema()
export class Notification {
    @Prop({ type: mongoose.Schema.ObjectId, ref: 'Admin', default: null })
    send_to: mongoose.Schema.Types.ObjectId;

    @Prop({ type: mongoose.Schema.ObjectId, default: null })
    send_by: mongoose.Schema.Types.ObjectId;

    @Prop({ type: String, default: null })
    title: string;

    @Prop({ type: String, default: null })
    body: string;

    @Prop({ type: Object, default: null })
    meta_data: object;

    @Prop({ type: Boolean, default: false })
    is_read: boolean

    @Prop({ type: Boolean, default: false })
    is_deleted: boolean
    
    @Prop({ type: Boolean, default: false })
    is_list_read_on_home: boolean

    @Prop({ enum: NotifyFor, default: null })
    notify_for: string;

    @Prop({ type: Number, default: moment().utc().valueOf() })
    created_at: number

    @Prop({ type: Number, default: null })
    updated_at: number
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationModel = SchemaFactory.createForClass(Notification);