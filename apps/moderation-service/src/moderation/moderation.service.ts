import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { CatalogClient } from '../clients/catalog.client';

@Injectable()
export class ModerationService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  constructor(private readonly catalogClient: CatalogClient) {}

  findAuditLogs() {
    throw new Error('Not implemented');
  }

  async takedownListing(adminId: string, itemId: string, callerRole: string) {
    throw new Error('Not implemented');
  }

  blockUser(blockerId: string, targetId: string) {
    throw new Error('Not implemented');
  }
}
