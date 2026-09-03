import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CatalogClient {
  private readonly baseUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
  private readonly headers = { 'x-internal-key': process.env.INTERNAL_SERVICE_SECRET };

  constructor(private readonly httpService: HttpService) {}

  async suspendListing(id: string) {
    // Suspend, not hard-delete: DELETE /items/:itemId now requires the caller to be the
    // item's actual seller (an ownership check moderation can't satisfy), and a hard delete
    // would orphan any order pointing at this item anyway. suspend() is the moderation
    // override built for exactly this — works from any status, no ownership check.
    const { data } = await firstValueFrom(
      this.httpService.patch(`${this.baseUrl}/items/${id}/suspend`, undefined, {
        headers: this.headers,
        timeout: 5000,
      }),
    );
    return data;
  }
}
