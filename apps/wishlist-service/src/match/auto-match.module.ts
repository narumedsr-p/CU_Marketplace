import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AutoMatchController } from './auto-match.controller';
import { AutoMatchService } from './auto-match.service';
import { NotificationClient } from '../clients/notification.client';

@Module({
  imports: [HttpModule],
  controllers: [AutoMatchController],
  providers: [AutoMatchService, NotificationClient],
})
export class AutoMatchModule {}
