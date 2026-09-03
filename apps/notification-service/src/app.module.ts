import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NotificationsModule } from './notifications/notifications.module';
import { PreferencesModule } from './preferences/preferences.module';
import { InternalAuthGuard } from './common/guards/internal-auth.guard';

@Module({
  imports: [NotificationsModule, PreferencesModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: InternalAuthGuard,
    },
  ],
})
export class AppModule {}
