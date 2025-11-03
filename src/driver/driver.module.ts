import { Module } from '@nestjs/common';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';
import { DriverGateway } from './driver.gateway';
import { DriverAggregation } from './driver.aggregation';
import { CustomerAggregation } from 'src/customer/customer.aggreagtion';
import { EarningModule } from 'src/earning/earning.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [EarningModule, NotificationModule],
  controllers: [DriverController],
  providers: [DriverService, DriverGateway, DriverAggregation, CustomerAggregation],
  exports: [DriverService]

})
export class DriverModule { }
