import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { GrpcInternalAuthGuard } from '../common/guards/grpc-internal-auth.guard';
import { ListingsService } from './listings.service';

interface ItemRequest {
  itemId: string;
}

interface ItemResponse {
  itemId: string;
  status: string;
}

@Controller()
@UseGuards(GrpcInternalAuthGuard)
export class ListingsGrpcController {
  constructor(private readonly listingsService: ListingsService) {}

  @GrpcMethod('CatalogService', 'ReserveItem')
  async reserveItem({ itemId }: ItemRequest): Promise<ItemResponse> {
    return this.toResponse(itemId, () => this.listingsService.reserve(itemId));
  }

  @GrpcMethod('CatalogService', 'UnreserveItem')
  async unreserveItem({ itemId }: ItemRequest): Promise<ItemResponse> {
    return this.toResponse(itemId, () => this.listingsService.unreserve(itemId));
  }

  @GrpcMethod('CatalogService', 'MarkItemAsSold')
  async markItemAsSold({ itemId }: ItemRequest): Promise<ItemResponse> {
    return this.toResponse(itemId, () => this.listingsService.markAsSold(itemId));
  }

  @GrpcMethod('CatalogService', 'SuspendItem')
  async suspendItem({ itemId }: ItemRequest): Promise<ItemResponse> {
    return this.toResponse(itemId, () => this.listingsService.suspend(itemId));
  }

  @GrpcMethod('CatalogService', 'SuspendAllUserItems')
  async suspendAllUserItems({ sellerId }: { sellerId: string }): Promise<{ suspendedCount: number }> {
    try {
      const result = await this.listingsService.suspendAllForSeller(sellerId);
      return { suspendedCount: result.count };
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }

  private async toResponse(
    itemId: string,
    fn: () => Promise<{ status: string }>,
  ): Promise<ItemResponse> {
    try {
      const item = await fn();
      return { itemId, status: item.status };
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }
}
