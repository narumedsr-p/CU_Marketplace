import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsGrpcController } from './notifications.grpc.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController, NotificationsGrpcController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
