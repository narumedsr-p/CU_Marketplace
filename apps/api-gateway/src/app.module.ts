import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProxyModule } from './proxy/proxy.module';
import { OpenApiModule } from './openapi/openapi.module';
import { GatewayAuthGuard } from './common/guards/gateway-auth.guard';

@Module({
  imports: [AuthModule, ProxyModule, OpenApiModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GatewayAuthGuard,
    },
  ],
})
export class AppModule {}
