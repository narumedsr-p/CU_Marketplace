import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { NotificationClient } from '../clients/notification.client';

const ANY_CATEGORY_ID = '00000000-0000-0000-0000-000000000000';
// word_similarity() weight applied to description matches, mirroring the old
// title(0.85)/description(0.65) split now that both use a continuous score.
const DESCRIPTION_WEIGHT = 0.8;

interface MatchCandidate {
  id: string;
  userId: string;
  keyword: string;
  matchScore: number;
}

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

    const description = item.description ?? '';

    // Rule's category must be the "any" sentinel, or match the item's category,
    // unless the item has no category at all (kept permissive, as before).
    const categoryFilter = item.categoryId
      ? Prisma.sql`AND ("category_id" = ${ANY_CATEGORY_ID}::uuid OR "category_id" = ${item.categoryId}::uuid)`
      : Prisma.empty;

    const scoreExpr = Prisma.sql`GREATEST(
        word_similarity("keyword", ${item.title}),
        word_similarity("keyword", ${description}) * ${DESCRIPTION_WEIGHT}
      )`;

    const candidates = await this.prisma.$queryRaw<MatchCandidate[]>(Prisma.sql`
      SELECT
        "rule_id" AS "id",
        "user_id" AS "userId",
        "keyword",
        ${scoreExpr} AS "matchScore"
      FROM "MatchRule"
      WHERE "is_active" = true
        AND "user_id" != ${item.sellerId}::uuid
        ${categoryFilter}
        AND ${scoreExpr} >= "min_score"
    `);

    let matchedCount = 0;

    for (const candidate of candidates) {
      const existingRecord = await this.prisma.matchRecord.findFirst({
        where: { ruleId: candidate.id, matchedItemId: item.id },
      });

      if (!existingRecord) {
        await this.prisma.matchRecord.create({
          data: {
            ruleId: candidate.id,
            matchedItemId: item.id,
            matchScore: candidate.matchScore,
            isNotified: true,
          },
        });
        matchedCount++;

        try {
          await this.notificationClient.send({
            userId: candidate.userId,
            title: 'Auto-Match Alert',
            message: `A new item matching "${candidate.keyword}" was listed: "${item.title}"`,
            kind: 'match',
            action: { type: 'listing', listingId: item.id },
          });
        } catch (err) {
          this.logger.error(
            `Failed to send auto-match notification to user ${candidate.userId}`,
            err,
          );
        }
      }
    }

    return { evaluated: true, matchedCount };
  }
}
