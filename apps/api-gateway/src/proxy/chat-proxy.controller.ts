import { All, Controller, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

// All REST internal-only routes for this service moved to gRPC (see libs/contracts/proto/chat.proto)
// and no longer exist over HTTP, so there's nothing left here to block.

@Controller('api/v1/chats')
export class ChatProxyController {
  private readonly baseUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3003';
  private readonly prefix = '/api/v1/chats';

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
