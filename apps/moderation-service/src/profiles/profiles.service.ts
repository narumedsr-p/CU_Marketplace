import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "../generated/prisma-client/client";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class ProfilesService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  findOne(userId: string) {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  async upsert(userId: string, data: any) {
    const { role, ...safeData } = data ?? {};

    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      return this.prisma.userProfile.update({
        where: { userId },
        data: safeData,
      });
    }
    return this.prisma.userProfile.create({ data: { userId, ...safeData } });
  }

  async updateStatus(userId: string, accountStatus: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException("Profile not found");
    }
    return this.prisma.userProfile.update({
      where: { userId },
      data: { accountStatus: accountStatus as any },
    });
  }

  banUser(targetUserId: string, callerRole: string) {
    if (callerRole !== "Admin") {
      throw new ForbiddenException("Only an admin can ban a user");
    }
    return this.updateStatus(targetUserId, "Banned");
  }
}
