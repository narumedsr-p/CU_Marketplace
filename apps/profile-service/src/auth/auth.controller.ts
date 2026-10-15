import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';

const OAUTH_STATE_COOKIE = 'oauth_state';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Real login: redirects to Google, gated to ALLOWED_EMAIL_DOMAIN (chula.ac.th).
  @Public()
  @Get('google')
  googleLogin(@Res() res: Response) {
    const { url, state } = this.authService.buildGoogleAuthUrl();
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });
    res.redirect(url);
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE);
    const redirectUrl = await this.authService.handleGoogleCallback(code, state, cookieState);
    res.redirect(redirectUrl);
  }
}
