import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { OrderClient } from '../clients/order.client';
import { NotificationClient } from '../clients/notification.client';

@Injectable()
export class ReviewsService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly orderClient: OrderClient,
    private readonly notificationClient: NotificationClient,
  ) {}

  findAll(revieweeId: string) {
    throw new Error('Not implemented');
  }

  async getSellerRating(revieweeId: string) {
    throw new Error('Not implemented');
  }

  async create(data: any) {
    throw new Error('Not implemented');
  }

  remove(id: string) {
    throw new Error('Not implemented');
  }
}
