import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './schemas/notification.schema';
import { NotificationPreference } from '../preferences/schemas/notification-preference.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
    @InjectModel(NotificationPreference.name)
    private readonly preferenceModel: Model<NotificationPreference>,
  ) {}

  async findAll(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.notificationModel.find({ userId }).sort({ createdAt: -1 });
  }

  async create(data: any) {
    if (!data?.userId || !data?.title || !data?.message) {
      throw new BadRequestException('userId, title, and message are required');
    }

    // Check user's notification preferences
    const pref = await this.preferenceModel.findById(data.userId);

    if (pref && pref.inAppEnabled === false) {
      this.logger.log(`Skipping in-app notification for user ${data.userId} per preferences`);
      return { skipped: true, reason: 'in_app_disabled' };
    }

    return this.notificationModel.create({
      userId: data.userId,
      title: data.title,
      message: data.message,
      isRead: false,
    });
  }

  async markAllAsRead(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const result = await this.notificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } },
    );

    return { updatedCount: result.modifiedCount };
  }
}
