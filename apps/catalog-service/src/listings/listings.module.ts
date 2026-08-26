import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { WishlistClient } from '../clients/wishlist.client';

@Module({
  imports: [HttpModule],
  controllers: [ListingsController],
  providers: [ListingsService, WishlistClient],
})
export class ListingsModule {}
