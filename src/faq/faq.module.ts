import { Module } from '@nestjs/common';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
import { FaqAggregation } from './faq.aggregation';

@Module({
  controllers: [FaqController],
  providers: [FaqService,FaqAggregation],
})
export class FaqModule {}
