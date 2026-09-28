import { All, Controller, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { getServiceHttpUrl } from '@workspace/contracts';

// reserve/unreserve/sold moved to gRPC (order-service <-> catalog-service) and are no
// longer reachable over HTTP at all, so they don't need blocking here anymore.
const INTERNAL_ONLY_PATTERNS = [
  /^\/items\/[^/]+\/suspend$/,
  /^\/users\/[^/]+\/items\/suspend$/,
];

@Controller('api/v1/catalog')
export class CatalogProxyController {
  private readonly baseUrl = getServiceHttpUrl('catalog');
  private readonly moderationBaseUrl = getServiceHttpUrl('moderation');
  private readonly prefix = '/api/v1/catalog';

  constructor(private readonly httpService: HttpService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.originalUrl.slice(this.prefix.length) || '/';
    const pathname = path.split('?')[0];

    if (INTERNAL_ONLY_PATTERNS.some((pattern) => pattern.test(pathname))) {
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

      if (req.method === 'GET' && pathname === '/items' && Array.isArray(response.data)) {
        response.data = await this.hideListingsFromBannedSellers(response.data);
      }

      res.status(response.status).json(response.data);
    } catch (error: any) {
      const status = error.response?.status ?? 502;
      res.status(status).json(error.response?.data ?? { message: 'Bad Gateway' });
    }
  }

  private async hideListingsFromBannedSellers(items: any[]) {
    try {
      const { data: bannedUsers } = await firstValueFrom(
        this.httpService.get(`${this.moderationBaseUrl}/banned`, {
          headers: { 'x-internal-key': process.env.INTERNAL_SERVICE_SECRET },
          timeout: 2000,
        }),
      );
      const bannedIds = new Set<string>(bannedUsers.map((u: any) => u.userId));
      return items.filter((item) => !bannedIds.has(item.sellerId));
    } catch {
      // moderation-service unreachable — fail open and return unfiltered results
      // rather than breaking search.
      return items;
    }
  }
}
