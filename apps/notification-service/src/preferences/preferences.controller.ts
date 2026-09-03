import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PreferencesService } from './preferences.service';

@Controller('notifications/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @ApiOperation({ summary: 'getNotificationPrefs()' })
  @Get()
  getNotificationPrefs(@CurrentUser() user: UserClaims) {
    return this.preferencesService.findOne(user.userId);
  }

  @ApiOperation({ summary: 'updateNotifPrefs()' })
  @Put()
  updateNotifPrefs(@Body() body: any, @CurrentUser() user: UserClaims) {
    return this.preferencesService.upsert(user.userId, body);
  }
}
