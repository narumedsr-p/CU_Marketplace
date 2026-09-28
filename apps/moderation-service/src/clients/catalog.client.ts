import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, Observable } from 'rxjs';

interface ItemResponse {
  itemId: string;
  status: string;
}

interface SuspendAllResponse {
  suspendedCount: number;
}

interface CatalogGrpcService {
  suspendItem(data: { itemId: string }, metadata: Metadata): Observable<ItemResponse>;
  suspendAllUserItems(
    data: { sellerId: string },
    metadata: Metadata,
  ): Observable<SuspendAllResponse>;
}

@Injectable()
export class CatalogClient implements OnModuleInit {
  private catalogGrpcService!: CatalogGrpcService;

  constructor(@Inject('CATALOG_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.catalogGrpcService = this.client.getService<CatalogGrpcService>('CatalogService');
  }

  private grpcMetadata() {
    const metadata = new Metadata();
    metadata.set('x-internal-key', process.env.INTERNAL_SERVICE_SECRET ?? '');
    return metadata;
  }

  async suspendListing(id: string) {
    return firstValueFrom(
      this.catalogGrpcService.suspendItem({ itemId: id }, this.grpcMetadata()),
    );
  }

  async suspendAllUserItems(sellerId: string) {
    return firstValueFrom(
      this.catalogGrpcService.suspendAllUserItems({ sellerId }, this.grpcMetadata()),
    );
  }
}
