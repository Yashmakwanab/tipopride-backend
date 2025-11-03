import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  controllers: [StaffController],
  providers: [StaffService],
  imports:[ActivityModule]
})
export class StaffModule { }
