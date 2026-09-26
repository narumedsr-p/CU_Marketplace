import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CatalogClient {
  private readonly baseUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
  private readonly headers = { 'x-internal-key': process.env.INTERNAL_SERVICE_SECRET };

  constructor(private readonly httpService: HttpService) {}

  async suspendListing(id: string) {
    const { data } = await firstValueFrom(
      this.httpService.patch(`${this.baseUrl}/items/${id}/suspend`, undefined, {
        headers: this.headers,
        timeout: 5000,
      }),
    );
    return data;
  }

  async suspendAllUserItems(sellerId: string) {
    const { data } = await firstValueFrom(
      this.httpService.patch(`${this.baseUrl}/users/${sellerId}/items/suspend`, undefined, {
        headers: this.headers,
        timeout: 5000,
      }),
    );
    return data;
  }
}
