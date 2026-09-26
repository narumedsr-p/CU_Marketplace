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
export class ChatService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly notificationClient: NotificationClient) {}

  async findRooms(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.prisma.chatRoom.findMany({
      where: {
        OR: [{ participant1: userId }, { participant2: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createRoom(data: any, callerId?: string, callerRole?: string) {
    const participant1 = data?.participant1 || callerId;
    const participant2 = data?.participant2 || data?.sellerId || data?.recipientId;
    const itemId = data?.itemId;

    if (!participant1 || !participant2 || !itemId) {
      throw new BadRequestException('participant1, participant2, and itemId are required');
    }

    if (participant1 === participant2) {
      throw new BadRequestException('Cannot start a chat with yourself');
    }

    if (callerId && callerRole !== 'Admin') {
      if (callerId !== participant1 && callerId !== participant2) {
        throw new ForbiddenException('Caller must be one of the participants in the chat room');
      }
    }

    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        itemId,
        OR: [
          { participant1, participant2 },
          { participant1: participant2, participant2: participant1 },
        ],
      },
    });

    if (existingRoom) {
      return existingRoom;
    }

    return this.prisma.chatRoom.create({
      data: {
        participant1,
        participant2,
        itemId,
      },
    });
  }

  async findMessages(roomId: string, callerId?: string, callerRole?: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    if (callerId && callerRole !== 'Admin') {
      if (room.participant1 !== callerId && room.participant2 !== callerId) {
        throw new ForbiddenException('You are not authorized to view messages in this chat room');
      }
    }

    return this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMessage(roomId: string, senderId: string, content: string) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    if (room.isBlocked) {
      throw new ForbiddenException('This chat room is blocked');
    }

    if (room.participant1 !== senderId && room.participant2 !== senderId) {
      throw new ForbiddenException('You are not a participant in this chat room');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        content,
        isSystemMsg: false,
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    const recipientId = room.participant1 === senderId ? room.participant2 : room.participant1;

    try {
      await this.notificationClient.send({
        userId: recipientId,
        title: 'New Chat Message',
        message: content,
      });
    } catch (err) {
      this.logger.error(`Failed to send notification for chat message in room ${roomId}`, err);
    }

    return message;
  }

  async sendSystemMessage(roomId: string, content: string) {
    if (!content || !content.trim()) {
      throw new BadRequestException('System message content cannot be empty');
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId: null,
        content,
        isSystemMsg: true,
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async blockRoom(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    return this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { isBlocked: true },
    });
  }
}
