import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { QUEUES } from '@workspace/contracts';
import { NotificationsService } from './notifications.service';
import type { NotificationPayload } from '@workspace/contracts';

const MAX_ATTEMPTS = 5;

@Controller()
export class NotificationsRmqController {
  private readonly logger = new Logger(NotificationsRmqController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('notification.push')
  async pushNotification(@Payload() payload: NotificationPayload, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      // create() throws before writing anything on invalid payloads, so a retry never
      // produces a duplicate notification — safe to just requeue on any failure.
      await this.notificationsService.create(payload);
      channel.ack(message);
    } catch (err: any) {
      const attempts = this.getAttemptCount(message);
      if (attempts >= MAX_ATTEMPTS) {
        this.logger.error(
          `Dead-lettering notification.push for user ${payload?.userId} after ${MAX_ATTEMPTS} attempts: ${err.message}`,
        );
        channel.sendToQueue(QUEUES.notificationDlq, message.content, {
          persistent: true,
          headers: message.properties.headers,
        });
        channel.ack(message);
        return;
      }

      this.logger.warn(
        `Retrying notification.push for user ${payload?.userId} (attempt ${attempts + 1}/${MAX_ATTEMPTS}): ${err.message}`,
      );
      channel.nack(message, false, false);
    }
  }

  private getAttemptCount(message: any): number {
    const death = message.properties.headers?.['x-death'];
    if (!Array.isArray(death)) return 0;
    const entry = death.find((d: any) => d.queue === QUEUES.notificationRetry);
    return entry?.count ?? 0;
  }
}
