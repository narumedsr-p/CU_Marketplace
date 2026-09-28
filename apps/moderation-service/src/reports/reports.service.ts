import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class ReportsService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  async findAll(query?: any) {
    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.targetType) {
      where.targetType = query.targetType;
    }
    return this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any) {
    if (!data?.reporterId || !data?.targetId || !data?.targetType || !data?.reason) {
      throw new BadRequestException('reporterId, targetId, targetType, and reason are required');
    }

    const validTargetTypes = ['User', 'Item', 'Chat'];
    if (!validTargetTypes.includes(data.targetType)) {
      throw new BadRequestException(`targetType must be one of: ${validTargetTypes.join(', ')}`);
    }

    return this.prisma.report.create({
      data: {
        reporterId: data.reporterId,
        targetId: data.targetId,
        targetType: data.targetType,
        reason: data.reason.trim(),
        status: 'Pending',
      },
    });
  }

  async updateStatus(reportId: string, status: 'Pending' | 'Reviewed' | 'Action_Taken') {
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status },
    });
  }
}
