import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { notifyPagination } from './dto/notification.dto';
import mongoose, { Types } from 'mongoose';
import { CommonService } from 'src/common/common.service';
import { DbService } from 'src/db/db.service';
import * as apn from '@parse/node-apn';
const path = require('path');

// Load the service account key JSON file
// const p8_file_path = require(
//   path.resolve(__dirname, '../../', 'AuthKey_N6JBABG97X.p8'),
// );

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private apnProvider: apn.Provider;
    constructor(
        @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: admin.app.App,
        private readonly common: CommonService,
        private readonly model: DbService,
    ) {
        this.apnProvider = new apn.Provider({
            token: {
                key: process.env.APN_KEY_FILE,
                keyId: process.env.APN_KEY_ID,
                teamId: process.env.APN_TEAM_ID,
            },
            production: false, // Set to true for production push
        });
    }

    send_notification = async (pushData: any, fcm_tokens: any, data: any, device_type?: any) => {
        try {
            data.title = pushData.title;
            data.body = pushData.message;
            let stringData: { [key: string]: string } = {};
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    stringData[key] = typeof data[key] === 'object'
                        ? JSON.stringify(data[key])
                        : String(data[key]);
                }
            }

            if (!pushData.title || !pushData.message) {
                throw new Error('Invalid pushData: title and message are required');
            }

            const tokens = Array.isArray(fcm_tokens) ? [...new Set(fcm_tokens)] : [fcm_tokens];

            const isAndroidBookingRequest = data.type === "booking_request" && device_type === "android";
            const isIOSBookingRequest = data.type === "booking_request" && device_type === "ios";
            const notificationBlock =
                isAndroidBookingRequest
                    ? undefined
                    : {
                        title: pushData.title,
                        body: pushData.message,
                    };

            const payload: admin.messaging.MulticastMessage = {
                data: stringData,
                ...(notificationBlock ? { notification: notificationBlock } : {}),
                ...(isAndroidBookingRequest ? {                      //android notificatin option changes only for booking request 
                    android: {
                        priority: "high",
                        collapseKey: "ride_request",
                        data: {
                            "content_available": "true"
                        }
                    }
                } : {
                    android: {
                        priority: "high",
                        ttl: 60 * 1000,
                        collapseKey: "ride_request",
                        notification: {
                            sound: "sound",
                            channelId: "com.google.firebase.messaging.default_notification_channel_id2",
                        }
                    }
                }),
                ...(
                    isIOSBookingRequest ? {
                        apns: {
                            headers: {
                                "apns-expiration": `${Math.floor((Date.now() + 60000) / 1000)}`,
                                "apns-priority": "10"
                            },
                            payload: {
                                aps: {
                                    sound: "sound.caf",
                                    contentAvailable: true,
                                    category: "ride_request",
                                    alert: {
                                        "title": pushData.title,
                                        "subtitle": "Long press to accept or reject",
                                        "body": pushData.message
                                    },
                                },
                            },
                        }
                    } : {}
                ),
                tokens,
            };

            console.log('Notification payload:', JSON.stringify(payload));
            const response = await this.firebaseAdmin.messaging().sendEachForMulticast(payload);
            console.log('Notification sent successfully:', JSON.stringify(response));

            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Failed for token ${tokens[idx]}:`, resp.error);
                }
            });

            return response;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    };


    async send_apn_notification(pushData: any, deviceToken: string, customData?: Record<string, any>) {
        const { title, message } = pushData || {};
        const notification = new apn.Notification();

        notification.alert = {
            title: title,
            body: message,
        };
        notification.topic = process.env.APN_BUNDLE_ID; // Your app's bundle ID
        notification.payload = {
            ...customData,
        };
        notification.sound = 'default';

        try {
            const response = await this.apnProvider.send(notification, deviceToken);
            this.logger.log(`APNs response: ${JSON.stringify(response)}`);

            if (response.failed && response.failed.length > 0) {
                this.logger.warn(`Failed to deliver to ${deviceToken}: ${JSON.stringify(response.failed)}`);
            }

            return response;
        } catch (error) {
            this.logger.error(`APNs error: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getNotification(payload: notifyPagination, user_id?: string) {
        let options = await this.common.set_options(payload.pagination, payload.limit)
        let options1 = await this.common.set_options(payload.unread_pagination, payload.unread_limit)
        let query = { send_to: new Types.ObjectId(user_id), is_deleted: false }
        let read = await this.model.notification.find({ ...query, is_read: true }, { __v: 0 }, options).sort({ _id: -1 })
        let readCount = await this.model.notification.countDocuments({ send_to: new Types.ObjectId(user_id), is_read: true })
        let unread = await this.model.notification.find({ ...query, is_read: false }, { __v: 0 }, options1).sort({ _id: -1 })
        let unreadCount = await this.model.notification.countDocuments({ send_to: new Types.ObjectId(user_id), is_read: false })

        return { read, unread, readCount, unreadCount }
    }

    async readAllNotification(user_id: string) {
        try {
            const update = await this.model.notification.updateMany(
                { send_to: new Types.ObjectId(user_id), is_read: false },
                { is_read: true }
            );
            console.log(update, '<-------marked all read');

            throw new HttpException({ message: `Marked as read` }, HttpStatus.OK)

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async readNotification(id: string, user_id: string) {
        try {
            let notification = await this.model.notification.findOne({ _id: new Types.ObjectId(id), send_to: new mongoose.Types.ObjectId(user_id) });
            console.log(notification, '<---notification');

            if (!notification?.is_read) {
                notification.is_read = true
                notification.save()
                throw new HttpException({ message: 'Marked as read' }, HttpStatus.OK)
            } else if (!notification) {
                throw new HttpException({ error_description: `Something went wrong!!`, error_code: "SOMETHING_WENT_WRONG" }, HttpStatus.BAD_REQUEST)
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async deleteNotification(id: string, user_id: string) {
        try {
            let notification = await this.model.notification.findOne({
                _id: new Types.ObjectId(id),
                send_to: new mongoose.Types.ObjectId(user_id), is_deleted: false
            });
            console.log(notification, '<---notification');

            if (!notification?.is_deleted) {
                notification.is_deleted = true
                notification.save()
                throw new HttpException({ message: 'Marked as deleted' }, HttpStatus.OK)
            } else if (!notification) {
                throw new HttpException({ error_description: `Something went wrong!!`, error_code: "SOMETHING_WENT_WRONG" }, HttpStatus.BAD_REQUEST)
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}
