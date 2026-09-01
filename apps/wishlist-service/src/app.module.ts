import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { WishlistModule } from './wishlist/wishlist.module';
import { AutoMatchModule } from './match/auto-match.module';
import { InternalAuthGuard } from './common/guards/internal-auth.guard';

@Module({
  imports: [WishlistModule, AutoMatchModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: InternalAuthGuard,
    },
  ],
})
export class AppModule {}
