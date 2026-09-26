import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PreferencesService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  async findOne(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      return {
        userId,
        emailEnabled: true,
        inAppEnabled: true,
      };
    }

    return pref;
  }

  async upsert(userId: string, data: any) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(data.emailEnabled !== undefined ? { emailEnabled: data.emailEnabled } : {}),
        ...(data.inAppEnabled !== undefined ? { inAppEnabled: data.inAppEnabled } : {}),
      },
      create: {
        userId,
        emailEnabled: data.emailEnabled ?? true,
        inAppEnabled: data.inAppEnabled ?? true,
      },
    });
  }
}
