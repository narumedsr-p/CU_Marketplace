import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ListingsService } from './listings.service';

@Controller()
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @ApiOperation({ summary: 'searchListings()' })
  @Get('items')
  searchListings(@Query() query: any) {
    return this.listingsService.findAll(query);
  }

  @ApiOperation({ summary: 'getItemDetails()' })
  @Get('items/:itemId')
  getItemDetails(@Param('itemId') itemId: string) {
    return this.listingsService.findOne(itemId);
  }

  @ApiOperation({ summary: 'createListing()' })
  @Post('items')
  createListing(@Body() body: any, @CurrentUser() user: UserClaims) {
    return this.listingsService.create({ ...body, sellerId: user.userId });
  }

  @ApiOperation({ summary: 'updateListing()' })
  @Put('items/:itemId')
  updateListing(@Param('itemId') itemId: string, @Body() body: any, @CurrentUser() user: UserClaims) {
    return this.listingsService.update(itemId, body, user.userId);
  }

  @ApiOperation({ summary: 'deleteListing()' })
  @Delete('items/:itemId')
  deleteListing(@Param('itemId') itemId: string, @CurrentUser() user: UserClaims) {
    return this.listingsService.remove(itemId, user.userId);
  }

  @ApiOperation({ summary: 'reserveItem() (Internal)' })
  @Patch('items/:itemId/reserve')
  reserveItem(@Param('itemId') itemId: string) {
    return this.listingsService.reserve(itemId);
  }

  @ApiOperation({ summary: 'unreserveItem() (Internal)' })
  @Patch('items/:itemId/unreserve')
  unreserveItem(@Param('itemId') itemId: string) {
    return this.listingsService.unreserve(itemId);
  }

  @ApiOperation({ summary: 'markItemAsSold() (Internal)' })
  @Patch('items/:itemId/sold')
  markItemAsSold(@Param('itemId') itemId: string) {
    return this.listingsService.markAsSold(itemId);
  }

  @ApiOperation({ summary: 'suspendItem() (Internal)' })
  @Patch('items/:itemId/suspend')
  suspendItem(@Param('itemId') itemId: string) {
    return this.listingsService.suspend(itemId);
  }

  @ApiOperation({ summary: 'suspendAllUserItems() (Internal)' })
  @Patch('users/:sellerId/items/suspend')
  suspendAllUserItems(@Param('sellerId') sellerId: string) {
    return this.listingsService.suspendAllForSeller(sellerId);
  }
}
