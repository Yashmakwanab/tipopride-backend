import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(
  path.resolve(__dirname, '../../', 'admin-sdk-firebase.json'),
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

@Module({
  controllers: [NotificationController],
  providers: [NotificationService,
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // Add any other configuration options here if needed
          });
        }
        return admin;
      },
    },
  ],
  exports: [NotificationService, 'FIREBASE_ADMIN']
})
export class NotificationModule { }
