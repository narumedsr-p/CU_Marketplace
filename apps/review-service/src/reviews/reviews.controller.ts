import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';

@Controller(['reviews', ''])
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiOperation({ summary: 'rateSeller()' })
  @Post(['reviews', ''])
  rateSeller(@Body() body: any, @CurrentUser() user: UserClaims) {
    return this.reviewsService.create({ ...body, reviewerId: user.userId });
  }

  @ApiOperation({ summary: 'getSellerRating()' })
  @Get(['users/:userId/rating', ':userId/rating'])
  getSellerRating(@Param('userId') userId: string) {
    return this.reviewsService.getSellerRating(userId);
  }

  @ApiOperation({ summary: 'getSellerReviews()' })
  @Get(['users/:userId/reviews', ':userId/reviews', ':userId'])
  getSellerReviews(@Param('userId') userId: string) {
    return this.reviewsService.findAll(userId);
  }

  @ApiOperation({ summary: 'deleteReview()' })
  @Delete(['reviews/:reviewId', ':reviewId'])
  deleteReview(@Param('reviewId') reviewId: string, @CurrentUser() user: UserClaims) {
    return this.reviewsService.remove(reviewId, user?.userId, user?.role);
  }
}
