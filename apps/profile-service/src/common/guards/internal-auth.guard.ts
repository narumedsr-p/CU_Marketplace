import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      // Non-HTTP contexts (e.g. gRPC) are guarded separately — see GrpcInternalAuthGuard.
      return true;
    }

    // The Google OAuth redirect/callback routes are hit directly by the browser, which has
    // no way to attach x-internal-key — see auth/auth.controller.ts.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
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
