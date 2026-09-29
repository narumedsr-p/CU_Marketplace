import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { NotificationClient } from '../clients/notification.client';
import { getServiceGrpcUrl } from '@workspace/contracts';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NOTIFICATION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'notification',
          protoPath: join(__dirname, '../../../libs/contracts/proto/notification.proto'),
          url: getServiceGrpcUrl('notification'),
        },
      },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, NotificationClient],
})
export class ChatModule {}
