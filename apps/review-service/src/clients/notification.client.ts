import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { NotificationPayload } from '@workspace/contracts';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationClient {
  constructor(@Inject('NOTIFICATION_PACKAGE') private readonly client: ClientProxy) {}

  async send(payload: NotificationPayload) {
    return firstValueFrom(this.client.emit('notification.push', payload));
  }
}
