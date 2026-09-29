import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "../generated/prisma-client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { WishlistClient } from "../clients/wishlist.client";

@Injectable()
export class ListingsService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  private readonly logger = new Logger(ListingsService.name);

  constructor(private readonly wishlistClient: WishlistClient) {}

  findAll(query: any) {
    // Public search only ever shows Available items — Sold/Reserved items
    // shouldn't appear to buyers browsing the marketplace.
    const where: any = { status: "Available" };
    if (query?.category_id) {
      where.categoryId = query.category_id;
    }
    if (query?.search) {
      where.title = { contains: query.search, mode: "insensitive" };
    }
    return this.prisma.item.findMany({ where });
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item || item.status !== "Available") {
      throw new NotFoundException("Item not found");
    }
    return item;
  }

  async create(data: any) {
    const item = await this.prisma.item.create({ data });
    try {
      await this.wishlistClient.evaluateItem(item);
    } catch (err) {
      this.logger.error(
        `Failed to evaluate wishlist matches for item ${item.id}`,
        err,
      );
    }
    return item;
  }

  async update(id: string, data: any, callerId: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException("Item not found");
    }
    if (item.sellerId !== callerId) {
      throw new ForbiddenException(
        "Only the seller of this item can update it",
      );
    }
    return this.prisma.item.update({ where: { id }, data });
  }

  async remove(id: string, callerId: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException("Item not found");
    }
    if (item.sellerId !== callerId) {
      throw new ForbiddenException(
        "Only the seller of this item can delete it",
      );
    }

    const result = await this.prisma.item.deleteMany({
      where: { id, status: { notIn: ["Reserved", "Sold"] } },
    });
    if (result.count === 0) {
      const current = await this.prisma.item.findUnique({ where: { id } });
      throw new ConflictException(
        `Cannot delete an item that is ${current?.status} — it has an order tied to it`,
      );
    }
    return item;
  }

  async reserve(id: string) {
    const result = await this.prisma.item.updateMany({
      where: { id, status: "Available" },
      data: { status: "Reserved" },
    });
    if (result.count === 0) {
      const current = await this.prisma.item.findUnique({ where: { id } });
      if (!current) {
        throw new NotFoundException("Item not found");
      }
      throw new ConflictException(
        `Cannot reserve an item that is ${current.status}`,
      );
    }
    return this.prisma.item.findUniqueOrThrow({ where: { id } });
  }

  async unreserve(id: string) {
    const result = await this.prisma.item.updateMany({
      where: { id, status: "Reserved" },
      data: { status: "Available" },
    });
    if (result.count === 0) {
      const current = await this.prisma.item.findUnique({ where: { id } });
      if (!current) {
        throw new NotFoundException("Item not found");
      }
      throw new ConflictException(
        `Cannot unreserve an item that is ${current.status}`,
      );
    }
    return this.prisma.item.findUniqueOrThrow({ where: { id } });
  }

  async markAsSold(id: string) {
    const result = await this.prisma.item.updateMany({
      where: { id, status: "Reserved" },
      data: { status: "Sold" },
    });
    if (result.count === 0) {
      const current = await this.prisma.item.findUnique({ where: { id } });
      if (!current) {
        throw new NotFoundException("Item not found");
      }
      throw new ConflictException(
        `Cannot mark an item as sold that is ${current.status}`,
      );
    }
    return this.prisma.item.findUniqueOrThrow({ where: { id } });
  }

  async getItemStatus(id: string): Promise<string | null> {
    const item = await this.prisma.item.findUnique({
      where: { id },
      select: { status: true },
    });
    return item?.status ?? null;
  }
}
