import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UserClaims, getServiceHttpUrl } from '@workspace/contracts';

@Injectable()
export class AuthService {
  private readonly moderationServiceUrl = getServiceHttpUrl('moderation');

  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {}

  // Almost every service's schema types user-reference columns (sellerId, buyerId,
  // reviewerId, adminId, etc.) as Postgres `uuid`, so the mock userId must actually be a
  // valid UUID — a human-readable id like 'student-0001' would fail with "invalid input
  // syntax for type uuid" the moment it's written to any of those tables (e.g. placing an
  // order, creating a listing, an admin audit log entry).
  async issueDummyToken(userId = '00000000-0000-0000-0000-000000000001'): Promise<string> {
    const profile = await this.getProfile(userId);
    if (profile?.accountStatus === 'Banned' || profile?.accountStatus === 'Deleted') {
      throw new ForbiddenException('This account is banned or deleted');
    }

    // role comes from the persisted profile (defaults to 'Student' if no profile exists
    // yet) so admin-gated endpoints can actually be enforced — previously this was
    // hardcoded to 'student' for everyone, making a real admin check impossible.
    const claims: UserClaims = {
      userId,
      email: `${userId}@cu.edu`,
      role: profile?.role ?? 'Student',
    };

    return this.jwtService.sign(claims);
  }

  private async getProfile(
    userId: string,
  ): Promise<{ accountStatus: string; role: string } | null> {
    try {
      // Calling moderation-service directly (not through the gateway's own proxy), so this
      // must match its native route — ProfilesController is mounted at root (`/:userId`),
      // not `/profiles/:userId` (that prefix only exists because the gateway's proxy
      // strips `/api/v1/profiles` before forwarding). Using the wrong path here silently
      // 404s forever, which is what was happening before this fix.
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.moderationServiceUrl}/${userId}`, {
          timeout: 1000,
          headers: { 'x-internal-key': process.env.INTERNAL_SERVICE_SECRET },
        }),
      );
      return data ?? null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new ServiceUnavailableException('Unable to verify account status right now');
    }
  }
}
