import { Global, Module } from '@nestjs/common';
import { EarningService } from './earning.service';
import { EarningController } from './earning.controller';
import { EarningAggregation } from './earning.aggregation';

@Global()
@Module({
  controllers: [EarningController],
  providers: [EarningService, EarningAggregation],
  exports: [EarningService, EarningAggregation]
})
export class EarningModule { }
