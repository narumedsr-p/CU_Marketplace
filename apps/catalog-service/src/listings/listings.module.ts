import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ListingsController } from './listings.controller';
import { ListingsGrpcController } from './listings.grpc.controller';
import { CatalogItemStatusRmqController } from './catalog-item-status.rmq.controller';
import { ListingsService } from './listings.service';
import { WishlistClient } from '../clients/wishlist.client';
import { getServiceGrpcUrl } from '@workspace/contracts';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'WISHLIST_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'wishlist',
          protoPath: join(__dirname, '../../../libs/contracts/proto/wishlist.proto'),
          url: getServiceGrpcUrl('wishlist'),
        },
      },
    ]),
  ],
  controllers: [ListingsController, ListingsGrpcController, CatalogItemStatusRmqController],
  providers: [ListingsService, WishlistClient],
})
export class ListingsModule {}
