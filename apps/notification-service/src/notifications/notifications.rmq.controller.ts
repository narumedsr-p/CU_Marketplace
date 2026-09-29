import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';

interface PushMessage {
  userId: string;
  title: string;
  message: string;
}

@Controller()
export class NotificationsRmqController {
  private readonly logger = new Logger(NotificationsRmqController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('notification.push')
  async pushNotification(@Payload() { userId, title, message }: PushMessage) {
    try {
      await this.notificationsService.create({ userId, title, message });
    } catch (err: any) {
      this.logger.error(`Failed to process notification.push for user ${userId}: ${err.message}`);
    }
  }
}
