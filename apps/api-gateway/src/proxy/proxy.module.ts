import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CatalogProxyController } from './catalog-proxy.controller';
import { OrderProxyController } from './order-proxy.controller';
import { ChatProxyController } from './chat-proxy.controller';
import { WishlistProxyController } from './wishlist-proxy.controller';
import { ReviewProxyController } from './review-proxy.controller';
import { ProfileProxyController } from './profile-proxy.controller';
import { NotificationProxyController } from './notification-proxy.controller';

@Module({
  imports: [HttpModule],
  controllers: [
    CatalogProxyController,
    OrderProxyController,
    ChatProxyController,
    WishlistProxyController,
    ReviewProxyController,
    ProfileProxyController,
    NotificationProxyController,
  ],
})
export class ProxyModule {}
