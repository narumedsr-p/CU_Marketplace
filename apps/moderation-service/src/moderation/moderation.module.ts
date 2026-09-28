import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { CatalogClient } from '../clients/catalog.client';

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
    ]),
  ],
  controllers: [ModerationController],
  providers: [ModerationService, CatalogClient],
  exports: [ModerationService],
})
export class ModerationModule {}
