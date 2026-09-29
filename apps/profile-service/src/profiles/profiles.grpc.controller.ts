import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { GrpcInternalAuthGuard } from '../common/guards/grpc-internal-auth.guard';
import { ProfilesService } from './profiles.service';

interface OAuthLoginRequest {
  email: string;
  displayName: string;
  avatarUrl: string;
}

@Controller()
@UseGuards(GrpcInternalAuthGuard)
export class ProfilesGrpcController {
  constructor(private readonly profilesService: ProfilesService) {}

  @GrpcMethod('ProfileService', 'OAuthLogin')
  async oauthLogin({ email, displayName, avatarUrl }: OAuthLoginRequest) {
    const profile = await this.profilesService.findOrCreateByEmail(email, displayName, avatarUrl);
    return {
      userId: profile.userId,
      email: profile.email,
      accountStatus: profile.accountStatus,
      role: profile.role,
    };
  }
}
