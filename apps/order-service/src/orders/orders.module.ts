import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CatalogClient } from '../clients/catalog.client';
import { ChatClient } from '../clients/chat.client';
import { NotificationClient } from '../clients/notification.client';

@Module({
  imports: [HttpModule],
  controllers: [OrdersController],
  providers: [OrdersService, CatalogClient, ChatClient, NotificationClient],
})
export class OrdersModule {}
