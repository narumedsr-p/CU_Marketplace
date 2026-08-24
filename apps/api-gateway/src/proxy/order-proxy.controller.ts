import { All, Controller, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

const INTERNAL_ONLY_PATTERNS = [/^\/users\/[^/]+\/orders\/cancel$/, /^\/orders\/[^/]+\/verify$/];

@Controller('api/v1/orders')
export class OrderProxyController {
  private readonly baseUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';
  private readonly prefix = '/api/v1/orders';

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
      res.status(response.status).json(response.data);
    } catch (error: any) {
      const status = error.response?.status ?? 502;
      res.status(status).json(error.response?.data ?? { message: 'Bad Gateway' });
    }
  }
}
