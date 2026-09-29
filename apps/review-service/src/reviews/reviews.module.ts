import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { OrderClient } from '../clients/order.client';
import { NotificationClient } from '../clients/notification.client';
import { getServiceGrpcUrl } from '@workspace/contracts';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ORDER_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'order',
          protoPath: join(__dirname, '../../../libs/contracts/proto/order.proto'),
          url: getServiceGrpcUrl('order'),
        },
      },
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
  controllers: [ReviewsController],
  providers: [ReviewsService, OrderClient, NotificationClient],
})
export class ReviewsModule {}
