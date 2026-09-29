import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UserClaims } from '@workspace/contracts';
import { ProfileClient } from './profile.client';

@Injectable()
export class AuthService {
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  private readonly allowedEmailDomain = process.env.ALLOWED_EMAIL_DOMAIN || 'chula.ac.th';
  private readonly googleCallbackUrl =
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';
  private readonly googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    this.googleCallbackUrl,
  );

  constructor(
    private readonly jwtService: JwtService,
    private readonly profileClient: ProfileClient,
  ) {}

  // Step 1 of the real login flow: build Google's consent-screen URL. `state` is
  // returned to the controller to store in an httpOnly cookie and re-checked in
  // handleGoogleCallback() as CSRF protection (Google just echoes it back verbatim).
  buildGoogleAuthUrl(): { url: string; state: string } {
    const state = randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      redirect_uri: this.googleCallbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      // `hd` is only a UX hint (pre-fills/nudges the account picker) — Google warns it's
      // not a security guarantee, so the actual email suffix is re-checked below.
      hd: this.allowedEmailDomain,
      state,
      prompt: 'select_account',
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state };
  }

  // Step 2: exchange the code, verify the id_token's signature, enforce the domain
  // restriction, and mint the JWT. Returns a URL rather than throwing, since the caller
  // must always end in a browser redirect (success or error).
  async handleGoogleCallback(
    code: string | undefined,
    state: string | undefined,
    cookieState: string | undefined,
  ): Promise<string> {
    if (!code || !state || !cookieState || state !== cookieState) {
      return `${this.frontendUrl}/?error=invalid_state`;
    }

    let email: string | undefined;
    let emailVerified: boolean | undefined;
    let name: string | undefined;
    let picture: string | undefined;
    try {
      const { tokens } = await this.googleClient.getToken(code);
      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload?.email;
      emailVerified = payload?.email_verified;
      name = payload?.name;
      picture = payload?.picture;
    } catch {
      return `${this.frontendUrl}/?error=google_auth_failed`;
    }

    if (!email || !emailVerified || !this.isAllowedDomain(email)) {
      return `${this.frontendUrl}/?error=domain_not_allowed`;
    }

    let profile: { userId: string; accountStatus: string; role: string };
    try {
      profile = await this.findOrCreateProfileByEmail(email, name ?? email, picture ?? '');
    } catch {
      return `${this.frontendUrl}/?error=service_unavailable`;
    }

    if (profile.accountStatus === 'Deleted') {
      return `${this.frontendUrl}/?error=account_deleted`;
    }

    const claims: UserClaims = { userId: profile.userId, email, role: profile.role ?? 'Student' };
    const token = this.jwtService.sign(claims);
    return `${this.frontendUrl}/?token=${token}`;
  }

  // Accepts the bare domain (student@chula.ac.th) and any subdomain of it
  // (student@student.chula.ac.th, staff@alumni.chula.ac.th, ...), matched on the actual
  // domain segment after '@' with a '.' boundary — not a raw string suffix, since
  // `endsWith('@' + domain)` would also wrongly accept a spoofed 'x@evilchula.ac.th'.
  private isAllowedDomain(email: string): boolean {
    const domain = email.toLowerCase().split('@').pop() ?? '';
    return domain === this.allowedEmailDomain || domain.endsWith(`.${this.allowedEmailDomain}`);
  }

  private async findOrCreateProfileByEmail(
    email: string,
    displayName: string,
    avatarUrl: string,
  ): Promise<{ userId: string; accountStatus: string; role: string }> {
    return this.profileClient.oauthLogin(email, displayName, avatarUrl);
  }
}
