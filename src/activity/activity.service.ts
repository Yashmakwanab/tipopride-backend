/**
 *  Service responsible for logging user activities to the database
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActitvityDocument, Activity } from './activity-Schema';
import * as mongoose from 'mongoose';

@Injectable()

export class ActivityService {

    constructor(@InjectModel(Activity.name) private activityModel: Model<ActitvityDocument>) { }

    async logActivity(params: {
        booking_id: string;
        userId: string;
        action: string;
        resource: string;
        description?: string;
        payload?: any;
    }) {
        const { booking_id, userId, action, resource, description, payload } = params;

        let status = this.activityModel.create({
            booking_id,
            userId,
            action,
            resource,
            description,
            payload,
        });

        console.log(status);
        console.log("params", params);
    }


    async getAllActivities() {
        return this.activityModel.find().sort({ createdAt: -1 }).exec(); // optional: latest first
    }

    async getAllBookingActivities(booking_id: any) {
        return this.activityModel.find({ booking_id: new mongoose.Types.ObjectId(booking_id) }).sort({ createdAt: -1 }); // optional: latest first
    }

    async getActivityWithTypeOne(query: any) {
        return this.activityModel.findOne(query);
    }

}
