import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ReviewsModule } from './reviews/reviews.module';
import { InternalAuthGuard } from './common/guards/internal-auth.guard';

@Module({
  imports: [ReviewsModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: InternalAuthGuard,
    },
  ],
})
export class AppModule {}
