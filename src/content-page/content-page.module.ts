import { Module } from '@nestjs/common';
import { ContentPageService } from './content-page.service';
import { ContentPageController } from './content-page.controller';
import { ContentPageAggregation } from './content-page.aggregation';

@Module({
  controllers: [ContentPageController],
  providers: [ContentPageService,ContentPageAggregation],
  exports:[ContentPageService]
})
export class ContentPageModule {}
