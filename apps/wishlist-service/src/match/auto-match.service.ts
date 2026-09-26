import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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

  async createRule(data: any) {
    if (!data?.userId || !data?.keyword?.trim()) {
      throw new BadRequestException('userId and keyword are required');
    }

    const categoryId =
      data.categoryId || '00000000-0000-0000-0000-000000000000';

    return this.prisma.matchRule.create({
      data: {
        userId: data.userId,
        categoryId,
        keyword: data.keyword.trim(),
        minScore: data.minScore ?? 0.5,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findRules(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return this.prisma.matchRule.findMany({
      where: { userId },
      include: {
        matches: {
          orderBy: { matchedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRule(id: string, data: any, callerId?: string, callerRole?: string) {
    const existing = await this.prisma.matchRule.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Match rule not found');
    }

    if (callerId && callerRole !== 'Admin' && existing.userId !== callerId) {
      throw new ForbiddenException('You are not authorized to update this match rule');
    }

    return this.prisma.matchRule.update({
      where: { id },
      data: {
        ...(data.keyword !== undefined ? { keyword: data.keyword.trim() } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.minScore !== undefined ? { minScore: data.minScore } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async removeRule(id: string, callerId?: string, callerRole?: string) {
    const existing = await this.prisma.matchRule.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Match rule not found');
    }

    if (callerId && callerRole !== 'Admin' && existing.userId !== callerId) {
      throw new ForbiddenException('You are not authorized to delete this match rule');
    }

    await this.prisma.matchRecord.deleteMany({
      where: { ruleId: id },
    });

    return this.prisma.matchRule.delete({
      where: { id },
    });
  }

  async findMatches(ruleId: string, callerId?: string, callerRole?: string) {
    const rule = await this.prisma.matchRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule) {
      throw new NotFoundException('Match rule not found');
    }

    if (callerId && callerRole !== 'Admin' && rule.userId !== callerId) {
      throw new ForbiddenException('You are not authorized to view records for this rule');
    }

    return this.prisma.matchRecord.findMany({
      where: { ruleId },
      orderBy: { matchedAt: 'desc' },
    });
  }

  async evaluateItem(item: any) {
    if (!item?.id || !item?.title) {
      return { evaluated: false, matchedCount: 0 };
    }

    const rules = await this.prisma.matchRule.findMany({
      where: { isActive: true },
    });

    let matchedCount = 0;
    const titleLower = (item.title || '').toLowerCase();
    const descLower = (item.description || '').toLowerCase();

    for (const rule of rules) {
      if (rule.userId === item.sellerId) {
        continue;
      }

      if (
        rule.categoryId &&
        rule.categoryId !== '00000000-0000-0000-0000-000000000000' &&
        item.categoryId &&
        rule.categoryId !== item.categoryId
      ) {
        continue;
      }

      const keywordLower = rule.keyword.toLowerCase();
      let matchScore = 0;

      if (titleLower === keywordLower) {
        matchScore = 1.0;
      } else if (titleLower.includes(keywordLower)) {
        matchScore = 0.85;
      } else if (descLower.includes(keywordLower)) {
        matchScore = 0.65;
      }

      const minScore = Number(rule.minScore);
      if (matchScore >= minScore) {
        const existingRecord = await this.prisma.matchRecord.findFirst({
          where: { ruleId: rule.id, matchedItemId: item.id },
        });

        if (!existingRecord) {
          await this.prisma.matchRecord.create({
            data: {
              ruleId: rule.id,
              matchedItemId: item.id,
              matchScore,
              isNotified: true,
            },
          });
          matchedCount++;

          try {
            await this.notificationClient.send({
              userId: rule.userId,
              title: 'Auto-Match Alert',
              message: `A new item matching "${rule.keyword}" was listed: "${item.title}"`,
            });
          } catch (err) {
            this.logger.error(
              `Failed to send auto-match notification to user ${rule.userId}`,
              err,
            );
          }
        }
      }
    }

    return { evaluated: true, matchedCount };
  }
}
