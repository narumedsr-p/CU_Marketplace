import { All, Controller, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

const INTERNAL_ONLY_PATTERNS = [
  /^\/items\/[^/]+\/reserve$/,
  /^\/items\/[^/]+\/unreserve$/,
  /^\/items\/[^/]+\/sold$/,
  /^\/items\/[^/]+\/suspend$/,
  /^\/users\/[^/]+\/items\/suspend$/,
];

@Controller('api/v1/catalog')
export class CatalogProxyController {
  private readonly baseUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
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
      // TODO: hideListingsFromUser() — spec'd as "Gateway fetches the ban blacklist and
      // hides items from banned sellers in GET /items", but there's no endpoint yet to
      // fetch that blacklist from moderation-service (see TODO there) and no filtering
      // is applied to response.data here. Not implemented — see TODO.md item 1.
      res.status(response.status).json(response.data);
    } catch (error: any) {
      const status = error.response?.status ?? 502;
      res.status(status).json(error.response?.data ?? { message: 'Bad Gateway' });
    }
  }
}
