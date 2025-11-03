import { Module } from '@nestjs/common';
import { SurchargeService } from './surcharge.service';
import { SurchargeController } from './surcharge.controller';

@Module({
  controllers: [SurchargeController],
  providers: [SurchargeService],
})
export class SurchargeModule { }
