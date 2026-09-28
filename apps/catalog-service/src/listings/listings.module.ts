import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ListingsController } from './listings.controller';
import { ListingsGrpcController } from './listings.grpc.controller';
import { ListingsService } from './listings.service';
import { WishlistClient } from '../clients/wishlist.client';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'WISHLIST_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'wishlist',
          protoPath: join(__dirname, '../../../libs/contracts/proto/wishlist.proto'),
          url: process.env.WISHLIST_GRPC_URL || 'localhost:4004',
        },
      },
    ]),
  ],
  controllers: [ListingsController, ListingsGrpcController],
  providers: [ListingsService, WishlistClient],
})
export class ListingsModule {}
