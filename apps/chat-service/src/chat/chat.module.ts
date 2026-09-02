import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { NotificationClient } from '../clients/notification.client';

@Module({
  imports: [HttpModule],
  controllers: [ChatController],
  providers: [ChatService, NotificationClient],
})
export class ChatModule {}
