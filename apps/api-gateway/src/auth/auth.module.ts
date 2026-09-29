import { join } from 'path';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { getServiceGrpcUrl } from '@workspace/contracts';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ProfileClient } from './profile.client';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      signOptions: { expiresIn: '1h' },
    }),
    ClientsModule.register([
      {
        name: 'PROFILE_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          // NB: unlike the webpack-bundled services, the gateway compiles with plain tsc
          // and keeps its directory structure, so __dirname here is dist/auth/ — 4 levels
          // up reaches the repo root (dist/auth -> dist -> api-gateway -> apps -> root).
          protoPath: join(__dirname, '../../../../libs/contracts/proto/profile.proto'),
          url: getServiceGrpcUrl('profile'),
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, ProfileClient],
  exports: [JwtModule],
})
export class AuthModule {}
