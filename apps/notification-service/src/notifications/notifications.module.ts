import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsRmqController } from './notifications.rmq.controller';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { PreferencesModule } from '../preferences/preferences.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    PreferencesModule,
  ],
  controllers: [NotificationsController, NotificationsRmqController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
