import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class NotificationsService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  private readonly logger = new Logger(NotificationsService.name);

  async findAll(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any) {
    if (!data?.userId || !data?.title || !data?.message) {
      throw new BadRequestException('userId, title, and message are required');
    }

    // Check user's notification preferences
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId: data.userId },
    });

    if (pref && pref.inAppEnabled === false) {
      this.logger.log(`Skipping in-app notification for user ${data.userId} per preferences`);
      return { skipped: true, reason: 'in_app_disabled' };
    }

    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        isRead: false,
      },
    });
  }

  async markAllAsRead(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { updatedCount: result.count };
  }
}
