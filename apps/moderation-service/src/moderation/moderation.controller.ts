import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModerationService } from './moderation.service';

@Controller()
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @ApiOperation({ summary: 'getAuditLogs()' })
  @Get('audit-logs')
  getAuditLogs() {
    return this.moderationService.findAuditLogs();
  }

  @ApiOperation({ summary: 'blockUser()' })
  @Post('users/:targetId/block')
  blockUser(@Param('targetId') targetId: string, @CurrentUser() user: UserClaims) {
    return this.moderationService.blockUser(user.userId, targetId);
  }
}
