import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ChatModule } from './chat/chat.module';
import { InternalAuthGuard } from './common/guards/internal-auth.guard';

@Module({
  imports: [ChatModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: InternalAuthGuard,
    },
  ],
})
export class AppModule {}
