import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from './schemas/notification-preference.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
    ]),
  ],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [MongooseModule],
})
export class PreferencesModule {}
