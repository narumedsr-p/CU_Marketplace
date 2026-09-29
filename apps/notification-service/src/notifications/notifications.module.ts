import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsRmqController } from './notifications.rmq.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController, NotificationsRmqController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
