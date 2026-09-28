import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { OrderClient } from '../clients/order.client';
import { NotificationClient } from '../clients/notification.client';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ORDER_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'order',
          protoPath: join(__dirname, '../../../libs/contracts/proto/order.proto'),
          url: process.env.ORDER_GRPC_URL || 'localhost:4002',
        },
      },
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
  controllers: [ReviewsController],
  providers: [ReviewsService, OrderClient, NotificationClient],
})
export class ReviewsModule {}
