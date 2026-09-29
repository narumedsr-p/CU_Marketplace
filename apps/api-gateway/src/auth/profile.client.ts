import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';

interface OAuthLoginResponse {
  userId: string;
  email: string;
  accountStatus: string;
  role: string;
}

interface ProfileGrpcService {
  oAuthLogin(
    data: { email: string; displayName: string; avatarUrl: string },
    metadata: Metadata,
  ): import('rxjs').Observable<OAuthLoginResponse>;
}

@Injectable()
export class ProfileClient implements OnModuleInit {
  private profileGrpcService!: ProfileGrpcService;

  constructor(@Inject('PROFILE_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.profileGrpcService = this.client.getService<ProfileGrpcService>('ProfileService');
  }

  private grpcMetadata() {
    const metadata = new Metadata();
    metadata.set('x-internal-key', process.env.INTERNAL_SERVICE_SECRET ?? '');
    return metadata;
  }

  async oauthLogin(email: string, displayName: string, avatarUrl: string) {
    return firstValueFrom(
      this.profileGrpcService.oAuthLogin({ email, displayName, avatarUrl }, this.grpcMetadata()),
    );
  }
}
