import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const UPLOAD_EXPIRES_SECONDS = 10 * 60;
const VIEW_EXPIRES_SECONDS = 60 * 60;

@Injectable()
export class CloudStorageAdapter {
  private readonly bucket = process.env.GARAGE_BUCKET ?? 'cu-marketplace-images';

  // Signed against the browser-facing endpoint (through Kong's /storage route), not
  // Garage's in-cluster address — the signature covers the Host header, so it has to
  // match whatever the browser will actually send the request to.
  private readonly client = new S3Client({
    endpoint: process.env.GARAGE_PUBLIC_URL ?? 'http://localhost:30080',
    region: 'garage',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.GARAGE_ACCESS_KEY ?? '',
      secretAccessKey: process.env.GARAGE_SECRET_KEY ?? '',
    },
    // The SDK's newer default (flexible checksums) adds x-amz-checksum-* params to
    // presigned URLs that Garage doesn't implement, which breaks its signature check.
    // 'WHEN_REQUIRED' keeps presigning on the plain SigV4 path Garage actually supports.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  // Flat key (no '/'): the public photo route takes it as a single Express route param.
  generateKey(originalFileName: string): string {
    const extension = originalFileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${randomUUID()}${extension ? `.${extension}` : ''}`;
  }

  async getUploadUrl(key: string): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: UPLOAD_EXPIRES_SECONDS });
  }

  // Never store this value — it expires. Store getPublicPath()'s value instead, which
  // resolves to a fresh one of these on every request.
  async getViewUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: VIEW_EXPIRES_SECONDS });
  }

  // The stable, non-expiring reference to save in the database and hand to the
  // frontend — a same-origin path that redirects to a fresh getViewUrl() each time.
  getPublicPath(key: string): string {
    return `/api/v1/catalog/photos/${encodeURIComponent(key)}`;
  }
}
