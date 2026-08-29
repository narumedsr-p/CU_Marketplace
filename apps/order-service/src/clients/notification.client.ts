import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationClient {
  private readonly baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
  private readonly headers = { 'x-internal-key': process.env.INTERNAL_SERVICE_SECRET };

  constructor(private readonly httpService: HttpService) {}

  async send(payload: any) {
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/notifications/push`, payload, {
        headers: this.headers,
        timeout: 5000,
      }),
    );
    return data;
  }
}
