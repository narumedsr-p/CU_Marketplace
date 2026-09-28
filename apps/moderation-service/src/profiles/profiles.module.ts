import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { CatalogClient } from '../clients/catalog.client';
import { OrderClient } from '../clients/order.client';
import { ChatClient } from '../clients/chat.client';
import { getServiceGrpcUrl } from '@workspace/contracts';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'CATALOG_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'catalog',
          protoPath: join(__dirname, '../../../libs/contracts/proto/catalog.proto'),
          url: getServiceGrpcUrl('catalog'),
        },
      },
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
        name: 'CHAT_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'chat',
          protoPath: join(__dirname, '../../../libs/contracts/proto/chat.proto'),
          url: getServiceGrpcUrl('chat'),
        },
      },
    ]),
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService, CatalogClient, OrderClient, ChatClient],
})
export class ProfilesModule {}
