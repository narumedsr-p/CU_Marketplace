import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserClaims } from '@workspace/contracts';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserClaims => {
    const request = ctx.switchToHttp().getRequest();
    return {
      userId: request.headers['x-user-id'],
      role: request.headers['x-user-role'],
      email: request.headers['x-user-email'] ?? '',
    };
  },
);
