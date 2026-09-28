import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, Observable } from 'rxjs';

interface ItemPayload {
  id: string;
  title: string;
  description?: string | null;
  sellerId: string;
  categoryId: string;
}

interface EvaluateResponse {
  evaluated: boolean;
  matchedCount: number;
}

interface WishlistGrpcService {
  evaluateItem(data: ItemPayload, metadata: Metadata): Observable<EvaluateResponse>;
}

@Injectable()
export class WishlistClient implements OnModuleInit {
  private wishlistGrpcService!: WishlistGrpcService;

  constructor(@Inject('WISHLIST_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.wishlistGrpcService = this.client.getService<WishlistGrpcService>('WishlistService');
  }

  async evaluateItem(item: ItemPayload) {
    const metadata = new Metadata();
    metadata.set('x-internal-key', process.env.INTERNAL_SERVICE_SECRET ?? '');
    return firstValueFrom(this.wishlistGrpcService.evaluateItem(item, metadata));
  }
}
