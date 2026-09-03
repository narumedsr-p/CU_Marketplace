import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ProfilesModule } from './profiles/profiles.module';
import { ReportsModule } from './reports/reports.module';
import { ModerationModule } from './moderation/moderation.module';
import { InternalAuthGuard } from './common/guards/internal-auth.guard';

@Module({
  imports: [ProfilesModule, ReportsModule, ModerationModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: InternalAuthGuard,
    },
  ],
})
export class AppModule {}
