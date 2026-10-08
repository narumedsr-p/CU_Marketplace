import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';
import type { NotificationPayload } from '@workspace/contracts';

@Controller()
export class NotificationsRmqController {
  private readonly logger = new Logger(NotificationsRmqController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('notification.push')
  async pushNotification(@Payload() payload: NotificationPayload) {
    try {
      await this.notificationsService.create(payload);
    } catch (err: any) {
      this.logger.error(`Failed to process notification.push for user ${payload?.userId}: ${err.message}`);
    }
  }
}
