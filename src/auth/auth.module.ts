import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CommonService } from 'src/common/common.service';
import { DriverService } from 'src/driver/driver.service';
import { BookingService } from 'src/booking/booking.service';
import { ActivityModule } from 'src/activity/activity.module';
@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService,CommonService],
  exports:[AuthService],
  imports:[ActivityModule]
})
export class AuthModule {}
