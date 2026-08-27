import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class CategoriesService {
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  findAll() {
    return this.prisma.category.findMany();
  }

  create(data: any, callerRole: string) {
    this.assertAdmin(callerRole);
    return this.prisma.category.create({ data });
  }

  async update(id: string, data: any, callerRole: string) {
    this.assertAdmin(callerRole);
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string, callerRole: string) {
    this.assertAdmin(callerRole);
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.prisma.category.delete({ where: { id } });
  }

  private assertAdmin(role: string) {
    if (role !== 'Admin') {
      throw new ForbiddenException('Only an admin can manage categories');
    }
  }
}
