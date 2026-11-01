import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { CloudStorageAdapter } from './cloud-storage.adapter';

// Authenticated (goes through the normal /api/v1/catalog route, jwt-auth included):
// only a signed-in user can request somewhere to upload to.
@Controller()
export class UploadsController {
  constructor(private readonly storage: CloudStorageAdapter) {}

  @ApiOperation({ summary: 'createUploadUrl()' })
  @Post('uploads')
  async createUploadUrl(@Body() body: { fileName?: string }) {
    const key = this.storage.generateKey(body.fileName ?? 'photo.jpg');
    const uploadUrl = await this.storage.getUploadUrl(key);
    // `path` is what the client should save on the listing — a stable reference,
    // not the presigned `uploadUrl`, which stops working once it expires.
    return { uploadUrl, path: this.storage.getPublicPath(key) };
  }
}

// Public (routed around jwt-auth — see catalog-photos-ingress in deploy/kong/kong.yaml):
// a plain <img src> can't carry a bearer token, and viewing a catalog photo doesn't need
// one anyway. That ingress uses strip-path: false (unlike every other catalog route), so
// this controller matches the full original path instead of assuming Kong stripped
// /api/v1/catalog — a bare ':key' param at the service root would risk shadowing sibling
// controllers' routes (categories, uploads, ...) depending on module registration order.
@Controller('api/v1/catalog/photos')
export class PhotosController {
  constructor(private readonly storage: CloudStorageAdapter) {}

  @ApiOperation({ summary: 'viewPhoto()' })
  @Get(':key')
  async viewPhoto(@Param('key') key: string, @Res() res: Response) {
    const url = await this.storage.getViewUrl(key);
    res.redirect(302, url);
  }
}
