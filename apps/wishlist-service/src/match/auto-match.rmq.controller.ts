import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { QUEUES } from '@workspace/contracts';
import { AutoMatchService } from './auto-match.service';

interface ItemPayload {
  id: string;
  title: string;
  description?: string;
  sellerId: string;
  categoryId: string;
}

const MAX_ATTEMPTS = 5;

@Controller()
export class AutoMatchRmqController {
  private readonly logger = new Logger(AutoMatchRmqController.name);

  constructor(private readonly autoMatchService: AutoMatchService) {}

  @EventPattern('catalog.item.created')
  async handleItemCreated(@Payload() item: ItemPayload, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      // evaluateItem checks for an existing MatchRecord before creating one, so
      // re-running this on a redelivered message is safe — no duplicate records or
      // duplicate notifications from a retry.
      await this.autoMatchService.evaluateItem(item);
      channel.ack(message);
    } catch (err: any) {
      const attempts = this.getAttemptCount(message);
      if (attempts >= MAX_ATTEMPTS) {
        this.logger.error(
          `Dead-lettering: item ${item.id} exceeded ${MAX_ATTEMPTS} evaluate attempts`,
          err,
        );
        channel.sendToQueue(QUEUES.wishlistEvaluateDlq, message.content, {
          persistent: true,
          headers: message.properties.headers,
        });
        channel.ack(message);
        return;
      }

      this.logger.warn(
        `Retrying wishlist evaluation for item ${item.id} (attempt ${attempts + 1}/${MAX_ATTEMPTS}): ${err.message}`,
      );
      channel.nack(message, false, false);
    }
  }

  private getAttemptCount(message: any): number {
    const death = message.properties.headers?.['x-death'];
    if (!Array.isArray(death)) return 0;
    const entry = death.find((d: any) => d.queue === QUEUES.wishlistEvaluateRetry);
    return entry?.count ?? 0;
  }
}
