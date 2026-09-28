import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

@Controller(['wishlists', ''])
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @ApiOperation({ summary: 'createWishlist()' })
  @Post()
  createWishlist(@Body() body: any, @CurrentUser() user: UserClaims) {
    return this.wishlistService.create({ ...body, userId: user.userId });
  }

  @ApiOperation({ summary: 'getWishlists()' })
  @Get()
  getWishlists(@CurrentUser() user: UserClaims) {
    return this.wishlistService.findAll(user.userId);
  }

  @ApiOperation({ summary: 'updateWishlist()' })
  @Put(':wishlistId')
  updateWishlist(
    @Param('wishlistId') wishlistId: string,
    @Body() body: any,
    @CurrentUser() user: UserClaims,
  ) {
    return this.wishlistService.update(wishlistId, body, user?.userId, user?.role);
  }

  @ApiOperation({ summary: 'deleteWishlist()' })
  @Delete(':wishlistId')
  deleteWishlist(
    @Param('wishlistId') wishlistId: string,
    @CurrentUser() user: UserClaims,
  ) {
    return this.wishlistService.remove(wishlistId, user?.userId, user?.role);
  }
}
