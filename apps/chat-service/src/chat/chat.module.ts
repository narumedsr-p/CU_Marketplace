import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { NotificationClient } from '../clients/notification.client';
import { getRabbitMqUrl, QUEUES } from '@workspace/contracts';
import { ChatGateway } from './chat.gateway';
import { ChatRoom, ChatRoomSchema } from './schemas/chat-room.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatRoom.name, schema: ChatRoomSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    ClientsModule.register([
      {
        name: 'NOTIFICATION_PACKAGE',
        transport: Transport.RMQ,
        options: {
          urls: [getRabbitMqUrl()],
          queue: QUEUES.notification,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, NotificationClient, ChatGateway],
})
export class ChatModule {}
