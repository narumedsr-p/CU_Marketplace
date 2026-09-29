import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProfilesService } from './profiles.service';

@Controller()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @ApiOperation({ summary: 'updateProfile()' })
  @Put('me')
  updateProfile(@Body() body: any, @CurrentUser() user: UserClaims) {
    return this.profilesService.upsert(user.userId, body);
  }

  @ApiOperation({ summary: 'deleteAccount()' })
  @Delete('me')
  deleteAccount(@CurrentUser() user: UserClaims) {
    return this.profilesService.updateStatus(user.userId, 'Deleted');
  }

  @ApiOperation({ summary: 'viewProfile()' })
  @Get(':userId')
  viewProfile(@Param('userId') userId: string) {
    return this.profilesService.findOne(userId);
  }
}
