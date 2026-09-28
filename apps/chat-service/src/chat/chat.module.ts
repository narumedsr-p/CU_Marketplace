import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ChatController } from './chat.controller';
import { ChatGrpcController } from './chat.grpc.controller';
import { ChatService } from './chat.service';
import { NotificationClient } from '../clients/notification.client';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NOTIFICATION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'notification',
          protoPath: join(__dirname, '../../../libs/contracts/proto/notification.proto'),
          url: process.env.NOTIFICATION_GRPC_URL || 'localhost:4007',
        },
      },
    ]),
  ],
  controllers: [ChatController, ChatGrpcController],
  providers: [ChatService, NotificationClient],
})
export class ChatModule {}
