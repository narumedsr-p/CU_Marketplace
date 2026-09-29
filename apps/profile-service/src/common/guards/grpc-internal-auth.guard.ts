import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class GrpcInternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const metadata = context.switchToRpc().getContext<Metadata>();
    const key = metadata.get('x-internal-key')[0];
    const expected = process.env.INTERNAL_SERVICE_SECRET;

    if (!expected || key !== expected) {
      throw new UnauthorizedException('Missing or invalid internal service key');
    }
    return true;
  }
}
