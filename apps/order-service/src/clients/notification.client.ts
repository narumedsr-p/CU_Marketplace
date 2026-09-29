import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class NotificationClient {
  constructor(@Inject('NOTIFICATION_PACKAGE') private readonly client: ClientProxy) {}

  async send(payload: { userId: string; title: string; message: string }) {
    return this.client.emit('notification.push', payload);
  }
}
