import { All, Controller, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

const INTERNAL_ONLY_PATTERNS: Record<string, RegExp[]> = {
  '/api/v1/wishlists': [],
  '/api/v1/matches': [/^\/evaluate$/],
};

@Controller(['api/v1/wishlists', 'api/v1/matches'])
export class WishlistProxyController {
  private readonly baseUrl = process.env.WISHLIST_SERVICE_URL || 'http://localhost:3004';
  private readonly prefixes = ['/api/v1/wishlists', '/api/v1/matches'];

  constructor(private readonly httpService: HttpService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const matchedPrefix = this.prefixes.find((prefix) => req.originalUrl.startsWith(prefix));
    const path = matchedPrefix ? req.originalUrl.slice(matchedPrefix.length) || '/' : req.originalUrl;
    const pathname = path.split('?')[0];

    const internalPatterns = matchedPrefix ? INTERNAL_ONLY_PATTERNS[matchedPrefix] ?? [] : [];
    if (internalPatterns.some((pattern) => pattern.test(pathname))) {
      res.status(403).json({ message: 'This endpoint is internal-only and cannot be accessed through the gateway.' });
      return;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          url: `${this.baseUrl}${path}`,
          method: req.method,
          data: req.body,
          headers: {
            'x-user-id': req.headers['x-user-id'],
            'x-user-role': req.headers['x-user-role'],
            'content-type': req.headers['content-type'],
            'x-internal-key': process.env.INTERNAL_SERVICE_SECRET,
          },
        }),
      );
      res.status(response.status).json(response.data);
    } catch (error: any) {
      const status = error.response?.status ?? 502;
      res.status(status).json(error.response?.data ?? { message: 'Bad Gateway' });
    }
  }
}
