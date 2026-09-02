import { Injectable, Logger } from '@nestjs/common';
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

  findRooms(userId: string) {
    throw new Error('Not implemented');
  }

  createRoom(data: any) {
    throw new Error('Not implemented');
  }

  findMessages(roomId: string) {
    throw new Error('Not implemented');
  }

  async createMessage(roomId: string, senderId: string, content: string) {
    throw new Error('Not implemented');
  }

  sendSystemMessage(roomId: string, content: string) {
    throw new Error('Not implemented');
  }

  blockRoom(roomId: string) {
    throw new Error('Not implemented');
  }
}
