import { Injectable } from '@nestjs/common';

@Injectable()
export class CloudStorageAdapter {
  async getUploadUrl(fileName: string): Promise<string> {
    return `https://storage.example.com/upload/${encodeURIComponent(fileName)}`;
  }

  async getPublicUrl(fileName: string): Promise<string> {
    return `https://storage.example.com/files/${encodeURIComponent(fileName)}`;
  }
}
