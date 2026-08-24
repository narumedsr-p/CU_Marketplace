import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenApiController } from './openapi.controller';

@Module({
  imports: [HttpModule],
  controllers: [OpenApiController],
})
export class OpenApiModule {}
