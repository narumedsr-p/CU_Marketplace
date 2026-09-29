import { All, Controller, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { getServiceHttpUrl } from '@workspace/contracts';

// Routes below are internal-only (called by the gateway itself server-to-server, e.g.
// during the OAuth callback) and must never be reachable through this public proxy.
const INTERNAL_ONLY_PATHS = ['/oauth-login'];

@Controller('api/v1/profiles')
export class ProfileProxyController {
  private readonly baseUrl = getServiceHttpUrl('profile');
  private readonly prefix = '/api/v1/profiles';

  constructor(private readonly httpService: HttpService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    try {
      const path = req.originalUrl.slice(this.prefix.length) || '/';
      if (INTERNAL_ONLY_PATHS.includes(path)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
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
