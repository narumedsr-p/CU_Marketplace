import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { NotificationClient } from '../clients/notification.client';

@Injectable()
export class AutoMatchService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  private readonly logger = new Logger(AutoMatchService.name);

  constructor(private readonly notificationClient: NotificationClient) {}

  createRule(data: any) {
    throw new Error('Not implemented');
  }

  findRules(userId: string) {
    throw new Error('Not implemented');
  }

  updateRule(id: string, data: any) {
    throw new Error('Not implemented');
  }

  removeRule(id: string) {
    throw new Error('Not implemented');
  }

  findMatches(ruleId: string) {
    throw new Error('Not implemented');
  }

  async evaluateItem(item: any) {
    throw new Error('Not implemented');
  }
}
