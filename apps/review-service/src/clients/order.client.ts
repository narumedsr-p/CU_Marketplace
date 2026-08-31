import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderClient {
  private readonly baseUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';
  private readonly headers = { 'x-internal-key': process.env.INTERNAL_SERVICE_SECRET };

  constructor(private readonly httpService: HttpService) {}

  async getOrder(id: string) {
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/orders/${id}/verify`, {
        headers: this.headers,
        timeout: 5000,
      }),
    );
    return data;
  }
}
