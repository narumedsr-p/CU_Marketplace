import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PreferencesService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  findOne(userId: string) {
    throw new Error('Not implemented');
  }

  upsert(userId: string, data: any) {
    throw new Error('Not implemented');
  }
}
