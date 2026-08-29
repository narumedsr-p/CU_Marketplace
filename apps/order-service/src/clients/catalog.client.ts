import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CatalogClient {
  private readonly baseUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
  private readonly headers = { 'x-internal-key': process.env.INTERNAL_SERVICE_SECRET };
  private readonly timeout = 5000;

  constructor(private readonly httpService: HttpService) {}

  async getListing(id: string) {
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/items/${id}`, {
        headers: this.headers,
        timeout: this.timeout,
      }),
    );
    return data;
  }

  async reserveItem(id: string) {
    const { data } = await firstValueFrom(
      this.httpService.patch(`${this.baseUrl}/items/${id}/reserve`, undefined, {
        headers: this.headers,
        timeout: this.timeout,
      }),
    );
    return data;
  }

  async unreserveItem(id: string) {
    const { data } = await firstValueFrom(
      this.httpService.patch(`${this.baseUrl}/items/${id}/unreserve`, undefined, {
        headers: this.headers,
        timeout: this.timeout,
      }),
    );
    return data;
  }

  async markItemAsSold(id: string) {
    const { data } = await firstValueFrom(
      this.httpService.patch(`${this.baseUrl}/items/${id}/sold`, undefined, {
        headers: this.headers,
        timeout: this.timeout,
      }),
    );
    return data;
  }
}
