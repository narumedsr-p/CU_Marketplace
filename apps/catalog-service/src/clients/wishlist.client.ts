import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WishlistClient {
  private readonly baseUrl = process.env.WISHLIST_SERVICE_URL || 'http://localhost:3004';
  private readonly headers = { 'x-internal-key': process.env.INTERNAL_SERVICE_SECRET };

  constructor(private readonly httpService: HttpService) {}

  async evaluateItem(item: any) {
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/matches/evaluate`, item, {
        headers: this.headers,
        timeout: 5000,
      }),
    );
    return data;
  }
}
