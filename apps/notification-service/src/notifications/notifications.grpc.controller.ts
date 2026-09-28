import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { GrpcInternalAuthGuard } from '../common/guards/grpc-internal-auth.guard';
import { NotificationsService } from './notifications.service';

interface PushRequest {
  userId: string;
  title: string;
  message: string;
}

@Controller()
@UseGuards(GrpcInternalAuthGuard)
export class NotificationsGrpcController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @GrpcMethod('NotificationService', 'PushNotification')
  async pushNotification({ userId, title, message }: PushRequest) {
    try {
      const result: any = await this.notificationsService.create({ userId, title, message });
      const skipped = !!result.skipped;
      return { success: !skipped, skipped };
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }
}
