import { Module } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { ComplaintController } from './complaint.controller';
import { ComplaintAggregation } from './complaint.aggregation';

@Module({
  controllers: [ComplaintController],
  providers: [ComplaintService,ComplaintAggregation],
})
export class ComplaintModule {}
