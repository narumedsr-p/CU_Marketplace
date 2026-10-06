import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      // Sockets are authenticated once in ChatGateway.handleConnection, not per event
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-internal-key'];
    const expected = process.env.INTERNAL_SERVICE_SECRET;

    if (!expected || key !== expected) {
      throw new UnauthorizedException('Missing or invalid internal service key');
    }
    return true;
  }
}
