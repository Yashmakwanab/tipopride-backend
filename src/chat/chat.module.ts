import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { NotificationModule } from 'src/notification/notification.module';
import { ChatAggregator } from './chat.aggregation';

@Module({
  imports: [NotificationModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatAggregator],
})
export class ChatModule { }
