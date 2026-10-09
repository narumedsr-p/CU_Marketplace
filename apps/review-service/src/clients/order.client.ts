import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, Observable } from 'rxjs';

interface OrderStatusResponse {
  orderId: string;
  status: string;
  buyerId: string;
  sellerId: string;
  itemTitle: string;
}

interface OrderGrpcService {
  verifyOrderCompletion(
    data: { orderId: string },
    metadata: Metadata,
  ): Observable<OrderStatusResponse>;
}

@Injectable()
export class OrderClient implements OnModuleInit {
  private orderGrpcService!: OrderGrpcService;

  constructor(@Inject('ORDER_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.orderGrpcService = this.client.getService<OrderGrpcService>('OrderService');
  }

  async getOrder(id: string) {
    const metadata = new Metadata();
    metadata.set('x-internal-key', process.env.INTERNAL_SERVICE_SECRET ?? '');
    return firstValueFrom(
      this.orderGrpcService.verifyOrderCompletion({ orderId: id }, metadata),
    );
  }
}
