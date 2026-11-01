import { Module } from '@nestjs/common';
import { CloudStorageAdapter } from './cloud-storage.adapter';
import { PhotosController, UploadsController } from './photos.controller';

@Module({
  controllers: [UploadsController, PhotosController],
  providers: [CloudStorageAdapter],
  exports: [CloudStorageAdapter],
})
export class StorageModule {}
