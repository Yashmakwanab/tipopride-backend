import { Module } from '@nestjs/common';
import { ContactusService } from './contactus.service';
import { ContactusController } from './contactus.controller';
import { ContactUsAggregation } from './contactus.aggregation';

@Module({
  controllers: [ContactusController],
  providers: [ContactusService,ContactUsAggregation],
})
export class ContactusModule {}
