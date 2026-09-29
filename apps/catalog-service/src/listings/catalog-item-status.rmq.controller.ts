import { Controller, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { QUEUES } from '@workspace/contracts';
import { ListingsService } from './listings.service';

interface ItemStatusMessage {
  itemId: string;
  orderId: string;
}

const MAX_ATTEMPTS = 5;

@Controller()
export class CatalogItemStatusRmqController {
  private readonly logger = new Logger(CatalogItemStatusRmqController.name);

  constructor(private readonly listingsService: ListingsService) {}

  @EventPattern('catalog.item.sold')
  async handleItemSold(@Payload() data: ItemStatusMessage, @Ctx() context: RmqContext) {
    await this.process(data, context, () => this.listingsService.markAsSold(data.itemId), 'Sold');
  }

  @EventPattern('catalog.item.unreserved')
  async handleItemUnreserved(@Payload() data: ItemStatusMessage, @Ctx() context: RmqContext) {
    await this.process(
      data,
      context,
      () => this.listingsService.unreserve(data.itemId),
      'Available',
    );
  }

  private async process(
    data: ItemStatusMessage,
    context: RmqContext,
    action: () => Promise<unknown>,
    targetStatus: string,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      await action();
      channel.ack(message);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        this.logger.error(
          `Dead-lettering: item ${data.itemId} not found (order ${data.orderId})`,
        );
        this.deadLetter(channel, message);
        return;
      }

      if (err instanceof ConflictException) {
        const currentStatus = await this.listingsService.getItemStatus(data.itemId);
        if (currentStatus === targetStatus) {
          // Already in the target state — a prior attempt succeeded and this is a
          // redelivery. Treat as success rather than retrying forever.
          channel.ack(message);
          return;
        }
        this.logger.error(
          `Dead-lettering: item ${data.itemId} is ${currentStatus}, expected a state ` +
            `reachable from this event (order ${data.orderId})`,
        );
        this.deadLetter(channel, message);
        return;
      }

      const attempts = this.getAttemptCount(message);
      if (attempts >= MAX_ATTEMPTS) {
        this.logger.error(
          `Dead-lettering: item ${data.itemId} exceeded ${MAX_ATTEMPTS} attempts (order ${data.orderId})`,
          err,
        );
        this.deadLetter(channel, message);
        return;
      }

      this.logger.warn(
        `Retrying item ${data.itemId} (attempt ${attempts + 1}/${MAX_ATTEMPTS}): ${err.message}`,
      );
      channel.nack(message, false, false);
    }
  }

  private deadLetter(channel: any, message: any) {
    channel.sendToQueue(QUEUES.catalogItemStatusDlq, message.content, {
      persistent: true,
      headers: message.properties.headers,
    });
    channel.ack(message);
  }

  private getAttemptCount(message: any): number {
    const death = message.properties.headers?.['x-death'];
    if (!Array.isArray(death)) return 0;
    const entry = death.find((d: any) => d.queue === QUEUES.catalogItemStatusRetry);
    return entry?.count ?? 0;
  }
}
