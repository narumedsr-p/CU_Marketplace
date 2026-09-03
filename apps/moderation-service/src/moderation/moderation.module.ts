import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { CatalogClient } from '../clients/catalog.client';

@Module({
  imports: [HttpModule],
  controllers: [ModerationController],
  providers: [ModerationService, CatalogClient],
  exports: [ModerationService],
})
export class ModerationModule {}
