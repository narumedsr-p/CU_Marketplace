import { Module } from '@nestjs/common';
import { CloudStorageAdapter } from './cloud-storage.adapter';

@Module({
  providers: [CloudStorageAdapter],
  exports: [CloudStorageAdapter],
})
export class StorageModule {}
