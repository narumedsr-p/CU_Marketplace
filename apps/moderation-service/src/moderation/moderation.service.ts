import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { CatalogClient } from '../clients/catalog.client';

@Injectable()
export class ModerationService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly catalogClient: CatalogClient) {}

  async findAuditLogs(callerRole?: string) {
    if (callerRole && callerRole !== 'Admin') {
      throw new ForbiddenException('Only admins can view audit logs');
    }

    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async takedownListing(adminId: string, itemId: string, callerRole: string) {
    if (callerRole !== 'Admin') {
      throw new ForbiddenException('Only an admin can remove a policy-violating listing');
    }

    // 1. Suspend listing in Catalog Service
    try {
      await this.catalogClient.suspendListing(itemId);
    } catch (err) {
      this.logger.error(`Failed to suspend listing ${itemId} in Catalog Service`, err);
    }

    // 2. Record action in AuditLog
    const log = await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'Takedown Listing',
        details: `Suspended policy-violating listing ${itemId}`,
      },
    });

    // 3. Update any pending reports for this item
    await this.prisma.report.updateMany({
      where: {
        targetId: itemId,
        targetType: 'Item',
        status: 'Pending',
      },
      data: { status: 'Action_Taken' },
    });

    return {
      success: true,
      message: `Listing ${itemId} has been taken down`,
      auditLogId: log.id,
    };
  }

  async blockUser(blockerId: string, targetId: string) {
    if (!blockerId || !targetId) {
      throw new BadRequestException('blockerId and targetId are required');
    }

    if (blockerId === targetId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const log = await this.prisma.auditLog.create({
      data: {
        adminId: blockerId,
        action: 'Block User',
        details: `User ${blockerId} blocked user ${targetId}`,
      },
    });

    return {
      success: true,
      blockerId,
      targetId,
      auditLogId: log.id,
    };
  }
}
