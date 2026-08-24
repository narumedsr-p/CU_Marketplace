import { Controller, Get } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';

interface ServiceDocEntry {
  name: string;
  prefix: string;
  docUrl: string;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

@Controller('api/v1')
export class OpenApiController {
  private readonly services: ServiceDocEntry[] = [
    {
      name: 'Catalog',
      prefix: '/api/v1/catalog',
      docUrl: `${process.env.CATALOG_SERVICE_URL || 'http://localhost:3001'}/docs-json`,
    },
    {
      name: 'Orders',
      prefix: '/api/v1/orders',
      docUrl: `${process.env.ORDER_SERVICE_URL || 'http://localhost:3002'}/docs-json`,
    },
    {
      name: 'Chats',
      prefix: '/api/v1/chats',
      docUrl: `${process.env.CHAT_SERVICE_URL || 'http://localhost:3003'}/docs-json`,
    },
    {
      name: 'Wishlists',
      prefix: '/api/v1/wishlists',
      docUrl: `${process.env.WISHLIST_SERVICE_URL || 'http://localhost:3004'}/docs-wishlists-json`,
    },
    {
      name: 'Matches',
      prefix: '/api/v1/matches',
      docUrl: `${process.env.WISHLIST_SERVICE_URL || 'http://localhost:3004'}/docs-matches-json`,
    },
    {
      name: 'Reviews',
      prefix: '/api/v1/reviews',
      docUrl: `${process.env.REVIEW_SERVICE_URL || 'http://localhost:3005'}/docs-json`,
    },
    {
      name: 'Profiles',
      prefix: '/api/v1/profiles',
      docUrl: `${process.env.MODERATION_SERVICE_URL || 'http://localhost:3006'}/docs-profiles-json`,
    },
    {
      name: 'Moderation',
      prefix: '/api/v1/moderation',
      docUrl: `${process.env.MODERATION_SERVICE_URL || 'http://localhost:3006'}/docs-moderation-json`,
    },
    {
      name: 'Notifications',
      prefix: '/api/v1/notifications',
      docUrl: `${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007'}/docs-json`,
    },
  ];

  constructor(private readonly httpService: HttpService) {}

  @Public()
  @Get('openapi.json')
  async getMergedSpec() {
    const paths: Record<string, any> = {};
    const schemas: Record<string, any> = {};

    for (const service of this.services) {
      try {
        const { data } = await firstValueFrom(
          this.httpService.get(service.docUrl, { timeout: 2000 }),
        );
        for (const [pathKey, pathItem] of Object.entries<any>(data.paths ?? {})) {
          for (const method of HTTP_METHODS) {
            if (pathItem[method]) {
              pathItem[method].tags = [service.name];
            }
          }
          paths[`${service.prefix}${pathKey}`] = pathItem;
        }
        Object.assign(schemas, data.components?.schemas ?? {});
      } catch {
        // Service unreachable right now — skip it and keep the rest of the combined doc usable.
      }
    }

    return {
      openapi: '3.0.0',
      info: {
        title: 'CU_Marketplace API (combined)',
        version: '1.0',
        description:
          'Merged OpenAPI spec aggregated from all downstream services via the API Gateway.',
      },
      paths,
      components: { schemas },
    };
  }
}
