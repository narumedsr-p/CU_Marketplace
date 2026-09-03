import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { ModerationService } from '../moderation/moderation.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly moderationService: ModerationService,
  ) {}

  @ApiOperation({ summary: 'createReport()' })
  @Post()
  createReport(@Body() body: any, @CurrentUser() user: UserClaims) {
    return this.reportsService.create({ ...body, reporterId: user.userId });
  }

  @ApiOperation({ summary: 'getReports()' })
  @Get()
  getReports() {
    return this.reportsService.findAll();
  }

  @ApiOperation({ summary: 'removeListing()' })
  @Delete('items/:itemId')
  removeListing(@Param('itemId') itemId: string, @CurrentUser() user: UserClaims) {
    return this.moderationService.takedownListing(user.userId, itemId, user.role);
  }
}
