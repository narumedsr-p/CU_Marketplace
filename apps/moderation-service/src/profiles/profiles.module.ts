import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { CatalogClient } from '../clients/catalog.client';
import { OrderClient } from '../clients/order.client';
import { ChatClient } from '../clients/chat.client';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'CATALOG_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'catalog',
          protoPath: join(__dirname, '../../../libs/contracts/proto/catalog.proto'),
          url: process.env.CATALOG_GRPC_URL || 'localhost:4001',
        },
      },
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
        name: 'CHAT_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'chat',
          protoPath: join(__dirname, '../../../libs/contracts/proto/chat.proto'),
          url: process.env.CHAT_GRPC_URL || 'localhost:4003',
        },
      },
    ]),
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService, CatalogClient, OrderClient, ChatClient],
})
export class ProfilesModule {}
