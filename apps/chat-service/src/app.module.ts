import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './chat/chat.module';
import { InternalAuthGuard } from './common/guards/internal-auth.guard';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({ uri: process.env.MONGODB_URI }),
    }),
    ChatModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: InternalAuthGuard,
    },
  ],
})
export class AppModule {}
