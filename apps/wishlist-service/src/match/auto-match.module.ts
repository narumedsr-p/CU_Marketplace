import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AutoMatchController } from './auto-match.controller';
import { AutoMatchGrpcController } from './auto-match.grpc.controller';
import { AutoMatchService } from './auto-match.service';
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
  controllers: [AutoMatchController, AutoMatchGrpcController],
  providers: [AutoMatchService, NotificationClient],
})
export class AutoMatchModule {}
