import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AutoMatchService } from './auto-match.service';

@Controller(['matches', ''])
export class AutoMatchController {
  constructor(private readonly autoMatchService: AutoMatchService) {}

  @ApiOperation({ summary: 'createMatchRule()' })
  @Post('rules')
  createMatchRule(@Body() body: any, @CurrentUser() user: UserClaims) {
    return this.autoMatchService.createRule({ ...body, userId: user.userId });
  }

  @ApiOperation({ summary: 'getMatchRules()' })
  @Get('rules')
  getMatchRules(@CurrentUser() user: UserClaims) {
    return this.autoMatchService.findRules(user.userId);
  }

  @ApiOperation({ summary: 'updateMatchRule()' })
  @Put('rules/:ruleId')
  updateMatchRule(
    @Param('ruleId') ruleId: string,
    @Body() body: any,
    @CurrentUser() user: UserClaims,
  ) {
    return this.autoMatchService.updateRule(ruleId, body, user?.userId, user?.role);
  }

  @ApiOperation({ summary: 'deleteMatchRule()' })
  @Delete('rules/:ruleId')
  deleteMatchRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: UserClaims,
  ) {
    return this.autoMatchService.removeRule(ruleId, user?.userId, user?.role);
  }

  @ApiOperation({ summary: 'getMatchRecords()' })
  @Get('rules/:ruleId/records')
  getMatchRecords(
    @Param('ruleId') ruleId: string,
    @CurrentUser() user?: UserClaims,
  ) {
    return this.autoMatchService.findMatches(ruleId, user?.userId, user?.role);
  }

  // evaluateAutoMatch is triggered by catalog-service via RabbitMQ — see auto-match.rmq.controller.ts.
}
