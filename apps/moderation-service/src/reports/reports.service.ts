import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class ReportsService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  findAll() {
    throw new Error('Not implemented');
  }

  create(data: any) {
    throw new Error('Not implemented');
  }
}
