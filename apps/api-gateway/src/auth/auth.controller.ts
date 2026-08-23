import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('callback')
  async callback(@Query('userId') userId?: string) {
    // Mock SSO only: real SSO would derive userId from the university's identity
    // provider, not a query param. This exists purely so different mock identities
    // (e.g. an admin-flagged profile) can be tested — see TODO.md.
    return { accessToken: await this.authService.issueDummyToken(userId) };
  }
}
