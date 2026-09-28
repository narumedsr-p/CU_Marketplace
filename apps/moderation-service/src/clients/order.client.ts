import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, Observable } from 'rxjs';

interface CancelResponse {
  cancelledCount: number;
}

interface OrderGrpcService {
  cancelPendingOrders(data: { userId: string }, metadata: Metadata): Observable<CancelResponse>;
}

@Injectable()
export class OrderClient implements OnModuleInit {
  private orderGrpcService!: OrderGrpcService;

  constructor(@Inject('ORDER_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.orderGrpcService = this.client.getService<OrderGrpcService>('OrderService');
  }

  private grpcMetadata() {
    const metadata = new Metadata();
    metadata.set('x-internal-key', process.env.INTERNAL_SERVICE_SECRET ?? '');
    return metadata;
  }

  async cancelPendingOrders(userId: string) {
    return firstValueFrom(
      this.orderGrpcService.cancelPendingOrders({ userId }, this.grpcMetadata()),
    );
  }
}
