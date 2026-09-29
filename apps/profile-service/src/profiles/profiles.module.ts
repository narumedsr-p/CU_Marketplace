import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesGrpcController } from './profiles.grpc.controller';
import { ProfilesService } from './profiles.service';

@Module({
  controllers: [ProfilesController, ProfilesGrpcController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
