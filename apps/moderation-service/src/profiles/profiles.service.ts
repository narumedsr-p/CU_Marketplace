import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "../generated/prisma-client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CatalogClient } from "../clients/catalog.client";
import { OrderClient } from "../clients/order.client";
import { ChatClient } from "../clients/chat.client";

@Injectable()
export class ProfilesService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private readonly catalogClient: CatalogClient,
    private readonly orderClient: OrderClient,
    private readonly chatClient: ChatClient,
  ) {}

  findOne(userId: string) {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  findByStatus(status: string) {
    return this.prisma.userProfile.findMany({
      where: { accountStatus: status as any },
      select: { userId: true },
    });
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

  async banUser(targetUserId: string, callerRole: string) {
    if (callerRole !== "Admin") {
      throw new ForbiddenException("Only an admin can ban a user");
    }
    const profile = await this.updateStatus(targetUserId, "Banned");

    try {
      await this.catalogClient.suspendAllUserItems(targetUserId);
    } catch (err) {
      this.logger.error(
        `Failed to suspend listings for banned user ${targetUserId}`,
        err,
      );
    }
    try {
      await this.orderClient.cancelPendingOrders(targetUserId);
    } catch (err) {
      this.logger.error(
        `Failed to cancel pending orders for banned user ${targetUserId}`,
        err,
      );
    }
    try {
      await this.chatClient.blockAllUserRooms(targetUserId);
    } catch (err) {
      this.logger.error(
        `Failed to block chat rooms for banned user ${targetUserId}`,
        err,
      );
    }

    return profile;
  }
}
