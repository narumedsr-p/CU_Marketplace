import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AutoMatchService } from './auto-match.service';

@Controller('matches')
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
  updateMatchRule(@Param('ruleId') ruleId: string, @Body() body: any) {
    return this.autoMatchService.updateRule(ruleId, body);
  }

  @ApiOperation({ summary: 'deleteMatchRule()' })
  @Delete('rules/:ruleId')
  deleteMatchRule(@Param('ruleId') ruleId: string) {
    return this.autoMatchService.removeRule(ruleId);
  }

  @ApiOperation({ summary: 'getMatchRecords()' })
  @Get('rules/:ruleId/records')
  getMatchRecords(@Param('ruleId') ruleId: string) {
    return this.autoMatchService.findMatches(ruleId);
  }

  @ApiOperation({ summary: 'evaluateAutoMatch() (Internal)' })
  @Post('evaluate')
  evaluateAutoMatch(@Body() item: any) {
    return this.autoMatchService.evaluateItem(item);
  }
}
