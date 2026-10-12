import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { NotificationPayload } from '@workspace/contracts';
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

  async create(data: NotificationPayload) {
    if (!data?.userId || !data?.title || !data?.message) {
      throw new BadRequestException('userId, title, and message are required');
    }
    if (data.action) {
      const targetId = {
        listing: data.action.type === 'listing' ? data.action.listingId : null,
        order: data.action.type === 'order' ? data.action.orderId : null,
        chat: data.action.type === 'chat' ? data.action.chatRoomId : null,
        review: data.action.type === 'review' ? data.action.reviewId : null,
      }[data.action.type];
      if (typeof targetId !== 'string' || !targetId.trim()) {
        throw new BadRequestException('Invalid notification action');
      }
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
      kind: data.kind ?? null,
      action: data.action ?? null,
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

  async markAsRead(userId: string, notificationId: string) {
    if (!userId || !notificationId) {
      throw new BadRequestException('User ID and notification ID are required');
    }
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true } },
      { new: true },
    );
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }
}
