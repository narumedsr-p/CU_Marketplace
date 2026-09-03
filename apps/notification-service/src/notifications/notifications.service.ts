import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class NotificationsService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  findAll(userId: string) {
    throw new Error('Not implemented');
  }

  create(data: any) {
    throw new Error('Not implemented');
  }

  markAllAsRead(userId: string) {
    throw new Error('Not implemented');
  }
}
