import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Activity, ActivityModel } from './activity-Schema';
import { ActivityController } from './activity.controller';


@Module({
  imports: [MongooseModule.forFeature([{ name: Activity.name, schema: ActivityModel }])],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService]
})
export class ActivityModule { }
