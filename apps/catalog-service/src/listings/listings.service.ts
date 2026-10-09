import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "../generated/prisma-client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { WishlistClient } from "../clients/wishlist.client";

// Loose enough that typos/partial words still surface results, in line with
// pg_trgm's own default similarity_threshold (0.3).
const SEARCH_MIN_SCORE = 0.3;
const ITEM_CONDITIONS = new Set(["New", "Like new", "Good", "Fair"]);

function validateItemMetadata(data: any) {
  if (data.condition != null && !ITEM_CONDITIONS.has(data.condition)) {
    throw new BadRequestException("Invalid item condition");
  }
  if (data.handoverSpot != null && (
    typeof data.handoverSpot !== "string" ||
    data.handoverSpot.trim().length === 0 ||
    data.handoverSpot.length > 120
  )) {
    throw new BadRequestException("Handover spot must be 1–120 characters");
  }
}

export interface ItemSearchRow {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  description: string | null;
  condition: string | null;
  handoverSpot: string | null;
  price: Prisma.Decimal;
  status: string;
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  matchScore: number;
}

@Injectable()
export class ListingsService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  constructor(private readonly wishlistClient: WishlistClient) {}

  findAll(query: any) {
    // Public search only ever shows Available items — Sold/Reserved items
    // shouldn't appear to buyers browsing the marketplace.
    if (query?.search) {
      const categoryFilter = query?.category_id
        ? Prisma.sql`AND "category_id" = ${query.category_id}::uuid`
        : Prisma.empty;

      return this.prisma.$queryRaw<ItemSearchRow[]>(Prisma.sql`
        SELECT
          "item_id" AS "id",
          "seller_id" AS "sellerId",
          "category_id" AS "categoryId",
          "title",
          "description",
          "condition",
          "handover_spot" AS "handoverSpot",
          "price",
          "status",
          "image_urls" AS "imageUrls",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt",
          word_similarity(${query.search}, "title") AS "matchScore"
        FROM "Item"
        WHERE "status" = 'Available'::"ItemStatus"
          ${categoryFilter}
          AND word_similarity(${query.search}, "title") >= ${SEARCH_MIN_SCORE}
        ORDER BY "matchScore" DESC
      `);
    }

    const where: any = { status: "Available" };
    if (query?.category_id) {
      where.categoryId = query.category_id;
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
    validateItemMetadata(data);
    const item = await this.prisma.item.create({ data });
    await this.wishlistClient.evaluateItem(item);
    return item;
  }

  async update(id: string, data: any, callerId: string) {
    validateItemMetadata(data);
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
