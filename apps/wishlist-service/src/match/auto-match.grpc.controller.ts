import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { GrpcInternalAuthGuard } from '../common/guards/grpc-internal-auth.guard';
import { AutoMatchService } from './auto-match.service';

interface ItemPayload {
  id: string;
  title: string;
  description: string;
  sellerId: string;
  categoryId: string;
}

@Controller()
@UseGuards(GrpcInternalAuthGuard)
export class AutoMatchGrpcController {
  constructor(private readonly autoMatchService: AutoMatchService) {}

  @GrpcMethod('WishlistService', 'EvaluateItem')
  async evaluateItem(item: ItemPayload) {
    try {
      const { evaluated, matchedCount } = await this.autoMatchService.evaluateItem(item);
      return { evaluated, matchedCount };
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }
}
