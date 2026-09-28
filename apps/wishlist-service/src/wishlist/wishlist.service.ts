import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class WishlistService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  async findAll(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return this.prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any) {
    if (!data?.userId || !data?.itemId) {
      throw new BadRequestException('userId and itemId are required');
    }

    const existing = await this.prisma.wishlist.findFirst({
      where: { userId: data.userId, itemId: data.itemId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.wishlist.create({
      data: {
        userId: data.userId,
        itemId: data.itemId,
      },
    });
  }

  async update(id: string, data: any, callerId?: string, callerRole?: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Wishlist item not found');
    }

    if (callerId && callerRole !== 'Admin' && existing.userId !== callerId) {
      throw new ForbiddenException('You are not authorized to update this wishlist item');
    }

    return this.prisma.wishlist.update({
      where: { id },
      data: {
        ...(data.itemId ? { itemId: data.itemId } : {}),
      },
    });
  }

  async remove(id: string, callerId?: string, callerRole?: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Wishlist item not found');
    }

    if (callerId && callerRole !== 'Admin' && existing.userId !== callerId) {
      throw new ForbiddenException('You are not authorized to delete this wishlist item');
    }

    return this.prisma.wishlist.delete({
      where: { id },
    });
  }

  async removeByItem(itemId: string) {
    return this.prisma.wishlist.deleteMany({
      where: { itemId },
    });
  }
}
