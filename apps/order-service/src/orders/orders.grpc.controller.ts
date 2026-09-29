import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { GrpcInternalAuthGuard } from '../common/guards/grpc-internal-auth.guard';
import { OrdersService } from './orders.service';

interface OrderRequest {
  orderId: string;
}

@Controller()
@UseGuards(GrpcInternalAuthGuard)
export class OrdersGrpcController {
  constructor(private readonly ordersService: OrdersService) {}

  @GrpcMethod('OrderService', 'VerifyOrderCompletion')
  async verifyOrderCompletion({ orderId }: OrderRequest) {
    const order = await this.ordersService.verify(orderId);
    if (!order) {
      throw new RpcException({ code: status.NOT_FOUND, message: 'Order not found' });
    }
    return {
      orderId: order.id,
      status: order.status,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
    };
  }
}
