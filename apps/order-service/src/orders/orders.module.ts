import { join } from 'path';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersController } from './orders.controller';
import { OrdersGrpcController } from './orders.grpc.controller';
import { OrdersService } from './orders.service';
import { CatalogClient } from '../clients/catalog.client';
import { ChatClient } from '../clients/chat.client';
import { NotificationClient } from '../clients/notification.client';
import { getServiceGrpcUrl } from '@workspace/contracts';

@Module({
  imports: [
    HttpModule,
    ClientsModule.register([
      {
        name: 'CATALOG_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'catalog',
          // NB: webpack bundles every module into a single dist/main.cjs, so
          // __dirname here resolves to the service's own dist/ dir at runtime
          // (same depth as apps/<service>/dist/), not this file's source path.
          protoPath: join(__dirname, '../../../libs/contracts/proto/catalog.proto'),
          url: getServiceGrpcUrl('catalog'),
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
  controllers: [OrdersController, OrdersGrpcController],
  providers: [OrdersService, CatalogClient, ChatClient, NotificationClient],
})
export class OrdersModule {}
