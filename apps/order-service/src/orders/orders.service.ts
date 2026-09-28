import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaClient } from "../generated/prisma-client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as QRCode from "qrcode";
import { CatalogClient } from "../clients/catalog.client";
import { ChatClient } from "../clients/chat.client";
import { NotificationClient } from "../clients/notification.client";

@Injectable()
export class OrdersService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  private readonly logger = new Logger(OrdersService.name);

  // qrToken is deliberately excluded from anything buyer/seller-facing: it's the proof
  // that the QR was physically scanned. Leaking it through a normal read endpoint would
  // let the buyer complete the order remotely without ever meeting up.
  private readonly publicOrderSelect = {
    id: true,
    buyerId: true,
    sellerId: true,
    itemId: true,
    agreedPrice: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    completedAt: true,
  };

  constructor(
    private readonly catalogClient: CatalogClient,
    private readonly chatClient: ChatClient,
    private readonly notificationClient: NotificationClient,
  ) {}

  findAllForUser(userId: string, role?: string) {
    const filter =
      role === "seller"
        ? { sellerId: userId }
        : role === "buyer"
          ? { buyerId: userId }
          : { OR: [{ buyerId: userId }, { sellerId: userId }] };
    return this.prisma.order.findMany({ where: filter, select: this.publicOrderSelect });
  }

  async findOneForUser(orderId: string, callerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.buyerId !== callerId && order.sellerId !== callerId) {
      throw new ForbiddenException("Only the buyer or seller of this order can view it");
    }
    const { qrToken, ...publicOrder } = order;
    return publicOrder;
  }

  async create(data: any) {
    const item = await this.catalogClient.getListing(data.itemId);
    if (!item) {
      throw new NotFoundException("Item not found");
    }
    if (item.sellerId === data.buyerId) {
      throw new ForbiddenException("You cannot order your own listing");
    }
    const order = await this.prisma.order.create({
      data: {
        itemId: data.itemId,
        buyerId: data.buyerId,
        sellerId: item.sellerId,
        agreedPrice: item.price,
      },
    });

    try {
      await this.catalogClient.reserveItem(order.itemId);
    } catch (err) {
      this.logger.error(
        `Failed to reserve item ${order.itemId} for order ${order.id} — rolling back order`,
        err,
      );
      await this.prisma.order.delete({ where: { id: order.id } });
      throw new ServiceUnavailableException(
        "Unable to reserve the item right now; order was not placed",
      );
    }

    try {
      await this.chatClient.createRoom({
        participant1: order.buyerId,
        participant2: order.sellerId,
        itemId: order.itemId,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create chat room for order ${order.id}`,
        err,
      );
    }

    try {
      await this.notificationClient.send({
        userId: order.sellerId,
        title: "New Order",
        message: `New order ${order.id} received`,
      });
    } catch (err) {
      this.logger.error(`Failed to notify seller for order ${order.id}`, err);
    }

    return order;
  }

  async generateQrCode(orderId: string, callerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.sellerId !== callerId) {
      throw new ForbiddenException(
        "Only the seller of this order can generate its handover QR code",
      );
    }
    if (order.status !== "Pending") {
      throw new ConflictException(
        `Cannot generate a handover QR code for an order that is ${order.status}`,
      );
    }

    let token = order.qrToken;
    if (!token) {
      token = randomBytes(16).toString("hex");
      const result = await this.prisma.order.updateMany({
        where: { id: orderId, qrToken: null },
        data: { qrToken: token },
      });
      if (result.count === 0) {
        const current = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
        token = current.qrToken!;
      }
    }

    const payload = JSON.stringify({ orderId, buyerId: order.buyerId, token });
    const qrImageDataUrl = await QRCode.toDataURL(payload);
    return { orderId, qrImageDataUrl };
  }

  async complete(orderId: string, callerId: string, token: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.buyerId !== callerId) {
      throw new ForbiddenException(
        "Only the buyer who scanned the QR code can confirm handover",
      );
    }

    const result = await this.prisma.order.updateMany({
      where: { id: orderId, status: "Pending", qrToken: token },
      data: { status: "Completed", completedAt: new Date(), qrToken: null },
    });
    if (result.count === 0) {
      const current = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (current?.status !== "Pending") {
        throw new ConflictException(
          `Cannot complete an order that is already ${current?.status}`,
        );
      }
      throw new BadRequestException("Invalid or expired QR code");
    }

    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    try {
      await this.catalogClient.markItemAsSold(updated.itemId);
    } catch (err) {
      // TODO: genuinely unresolved — order.status is already Completed and correct (can't
      // roll it back), but the item is now stuck out of sync in catalog-service with no
      // automatic fix. Needs a retry/reconciliation job (message broker or cron), which
      // this scaffold doesn't have yet. See TODO.md item 4.
      this.logger.error(
        `UNRESOLVED INCONSISTENCY: order ${updated.id} is Completed but item ${updated.itemId} was not marked Sold`,
        err,
      );
    }
    return updated;
  }

  async cancel(orderId: string, callerId: string) {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!existing) {
      throw new NotFoundException("Order not found");
    }
    if (existing.buyerId !== callerId && existing.sellerId !== callerId) {
      throw new ForbiddenException(
        "Only the buyer or seller of this order can cancel it",
      );
    }

    const result = await this.prisma.order.updateMany({
      where: { id: orderId, status: "Pending" },
      data: { status: "Cancelled" },
    });
    if (result.count === 0) {
      const current = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      throw new ConflictException(
        `Cannot cancel an order that is already ${current?.status}`,
      );
    }

    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    try {
      await this.catalogClient.unreserveItem(order.itemId);
    } catch (err) {
      // TODO: same unresolved gap as complete()'s markItemAsSold — Cancelled is correct and
      // final, but the item can be left stuck Reserved with nothing to auto-correct it.
      // Needs a retry/reconciliation job we don't have yet. See TODO.md item 4.
      this.logger.error(
        `UNRESOLVED INCONSISTENCY: order ${order.id} is Cancelled but item ${order.itemId} was not unreserved`,
        err,
      );
    }
    return order;
  }

  async cancelPendingForUser(userId: string) {
    const pendingOrders = await this.prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: "Pending",
      },
    });

    let cancelledCount = 0;
    for (const order of pendingOrders) {
      const result = await this.prisma.order.updateMany({
        where: { id: order.id, status: "Pending" },
        data: { status: "Cancelled" },
      });
      if (result.count === 0) {
        continue;
      }
      cancelledCount++;
      try {
        await this.catalogClient.unreserveItem(order.itemId);
      } catch (err) {
        // TODO: same unresolved gap as cancel() above, just batched — see TODO.md item 4.
        this.logger.error(
          `UNRESOLVED INCONSISTENCY: order ${order.id} is Cancelled but item ${order.itemId} was not unreserved`,
          err,
        );
      }
    }
    return { cancelledCount };
  }

  verify(orderId: string) {
    return this.prisma.order.findUnique({ where: { id: orderId } });
  }
}
