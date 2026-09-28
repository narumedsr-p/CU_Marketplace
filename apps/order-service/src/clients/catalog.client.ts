import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';

interface ItemResponse {
  itemId: string;
  status: string;
}

interface CatalogGrpcService {
  reserveItem(data: { itemId: string }, metadata: Metadata): import('rxjs').Observable<ItemResponse>;
  unreserveItem(data: { itemId: string }, metadata: Metadata): import('rxjs').Observable<ItemResponse>;
  markItemAsSold(data: { itemId: string }, metadata: Metadata): import('rxjs').Observable<ItemResponse>;
}

@Injectable()
export class CatalogClient implements OnModuleInit {
  private readonly baseUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
  private readonly headers = { 'x-internal-key': process.env.INTERNAL_SERVICE_SECRET };
  private readonly timeout = 5000;
  private catalogGrpcService!: CatalogGrpcService;

  constructor(
    private readonly httpService: HttpService,
    @Inject('CATALOG_PACKAGE') private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.catalogGrpcService = this.client.getService<CatalogGrpcService>('CatalogService');
  }

  private grpcMetadata() {
    const metadata = new Metadata();
    metadata.set('x-internal-key', process.env.INTERNAL_SERVICE_SECRET ?? '');
    return metadata;
  }

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
    return firstValueFrom(
      this.catalogGrpcService.reserveItem({ itemId: id }, this.grpcMetadata()),
    );
  }

  async unreserveItem(id: string) {
    return firstValueFrom(
      this.catalogGrpcService.unreserveItem({ itemId: id }, this.grpcMetadata()),
    );
  }

  async markItemAsSold(id: string) {
    return firstValueFrom(
      this.catalogGrpcService.markItemAsSold({ itemId: id }, this.grpcMetadata()),
    );
  }
}
