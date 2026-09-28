import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, Observable } from 'rxjs';

interface PushResponse {
  success: boolean;
  skipped: boolean;
}

interface NotificationGrpcService {
  pushNotification(
    data: { userId: string; title: string; message: string },
    metadata: Metadata,
  ): Observable<PushResponse>;
}

@Injectable()
export class NotificationClient implements OnModuleInit {
  private notificationGrpcService!: NotificationGrpcService;

  constructor(@Inject('NOTIFICATION_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.notificationGrpcService =
      this.client.getService<NotificationGrpcService>('NotificationService');
  }

  async send(payload: { userId: string; title: string; message: string }) {
    const metadata = new Metadata();
    metadata.set('x-internal-key', process.env.INTERNAL_SERVICE_SECRET ?? '');
    return firstValueFrom(this.notificationGrpcService.pushNotification(payload, metadata));
  }
}
