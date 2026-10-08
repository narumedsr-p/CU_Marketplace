import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { NotificationPayload } from '@workspace/contracts';

@Injectable()
export class NotificationClient {
  constructor(@Inject('NOTIFICATION_PACKAGE') private readonly client: ClientProxy) {}

  async send(payload: NotificationPayload) {
    return this.client.emit('notification.push', payload);
  }
}
