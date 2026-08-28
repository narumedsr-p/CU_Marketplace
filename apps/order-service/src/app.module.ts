import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OrdersModule } from './orders/orders.module';
import { InternalAuthGuard } from './common/guards/internal-auth.guard';

@Module({
  imports: [OrdersModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: InternalAuthGuard,
    },
  ],
})
export class AppModule {}
