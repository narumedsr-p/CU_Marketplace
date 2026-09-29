import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProfilesService } from './profiles.service';

@Controller()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // (Internal) called only by the gateway during the OAuth callback, before a JWT
  // exists yet — blocked from public access at the gateway's ProfileProxyController.
  // Must stay above ':userId' so it isn't swallowed as a literal userId value.
  @ApiOperation({ summary: 'oauthLogin() (Internal)' })
  @Post('oauth-login')
  oauthLogin(@Body() body: { email: string; displayName: string; avatarUrl: string }) {
    return this.profilesService.findOrCreateByEmail(body.email, body.displayName, body.avatarUrl);
  }

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
