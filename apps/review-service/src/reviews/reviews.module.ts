import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { OrderClient } from '../clients/order.client';
import { NotificationClient } from '../clients/notification.client';

@Module({
  imports: [HttpModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, OrderClient, NotificationClient],
})
export class ReviewsModule {}
