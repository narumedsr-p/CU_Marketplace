import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
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

  async findAll(revieweeId: string) {
    if (!revieweeId) {
      throw new BadRequestException('User ID is required');
    }

    return this.prisma.review.findMany({
      where: { revieweeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSellerRating(revieweeId: string) {
    if (!revieweeId) {
      throw new BadRequestException('User ID is required');
    }

    const reviews = await this.prisma.review.findMany({
      where: { revieweeId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return {
        revieweeId,
        averageRating: 0,
        totalReviews: 0,
      };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = Math.round((sum / reviews.length) * 100) / 100;

    return {
      revieweeId,
      averageRating,
      totalReviews: reviews.length,
    };
  }

  async create(data: any) {
    if (!data?.orderId || data?.rating === undefined || !data?.reviewerId) {
      throw new BadRequestException('orderId, rating, and reviewerId are required');
    }

    const rating = Number(data.rating);
    if (isNaN(rating) || rating < 0 || rating > 5 || !Number.isInteger(rating)) {
      throw new BadRequestException('Rating must be an integer between 0 and 5');
    }

    // 1. Verify order completion with Order Service
    let order: any = null;
    try {
      order = await this.orderClient.getOrder(data.orderId);
    } catch (err: any) {
      if (err.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException('Associated order not found');
      }
      this.logger.error(`Failed to verify order ${data.orderId} with Order Service`, err);
      throw new ServiceUnavailableException('Unable to verify order status with Order Service');
    }

    if (!order) {
      throw new NotFoundException('Associated order not found');
    }

    if (order.status !== 'Completed') {
      throw new ConflictException(
        `Cannot rate an order that is ${order.status}. Only completed orders can be reviewed.`,
      );
    }

    if (order.buyerId !== data.reviewerId) {
      throw new ForbiddenException('Only the buyer of the completed order can submit a review');
    }

    // 2. Check for duplicate review
    const existing = await this.prisma.review.findFirst({
      where: { orderId: data.orderId },
    });
    if (existing) {
      throw new ConflictException('A review has already been submitted for this order');
    }

    // 3. Save review to DB
    const review = await this.prisma.review.create({
      data: {
        orderId: data.orderId,
        itemTitle: order.itemTitle || null,
        reviewerId: data.reviewerId,
        revieweeId: order.sellerId,
        rating,
        comment: data.comment?.trim() || null,
      },
    });

    // 4. Send notification to seller
    try {
      await this.notificationClient.send({
        userId: order.sellerId,
        title: 'New Review Received',
        message: `A buyer gave you a ${rating}-star rating for completed order ${order.id}`,
        kind: 'review',
        action: { type: 'review', reviewId: review.id },
      });
    } catch (err) {
      this.logger.error(`Failed to send review notification to seller ${order.sellerId}`, err);
    }

    return review;
  }

  async remove(id: string, callerId?: string, callerRole?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (callerId && callerRole !== 'Admin' && review.reviewerId !== callerId) {
      throw new ForbiddenException('Only the author of the review or an admin can delete it');
    }

    return this.prisma.review.delete({
      where: { id },
    });
  }
}
