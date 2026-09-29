import { All, Controller, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { getServiceHttpUrl } from '@workspace/contracts';

// Push notifications are now produced onto RabbitMQ directly by each service and no
// longer exist over HTTP, so there's nothing left here to block.

@Controller('api/v1/notifications')
export class NotificationProxyController {
  private readonly baseUrl = getServiceHttpUrl('notification');
  private readonly prefix = '/api/v1/notifications';

  constructor(private readonly httpService: HttpService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.originalUrl.slice(this.prefix.length) || '/';

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
