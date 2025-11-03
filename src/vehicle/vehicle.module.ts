import { Module } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { VehicleController } from './vehicle.controller';
import { VehicleAggreagation } from './vehicle.aggregation';

@Module({
  controllers: [VehicleController],
  providers: [VehicleService,VehicleAggreagation],
  exports:[VehicleService]
})
export class VehicleModule {}
