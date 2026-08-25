import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ListingsModule } from './listings/listings.module';
import { CategoriesModule } from './categories/categories.module';
import { StorageModule } from './storage/storage.module';
import { InternalAuthGuard } from './common/guards/internal-auth.guard';

@Module({
  imports: [ListingsModule, CategoriesModule, StorageModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: InternalAuthGuard,
    },
  ],
})
export class AppModule {}
