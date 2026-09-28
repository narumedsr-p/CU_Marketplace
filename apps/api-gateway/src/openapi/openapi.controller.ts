import { Controller, Get } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { getServiceHttpUrl } from '@workspace/contracts';
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
      docUrl: `${getServiceHttpUrl('catalog')}/docs-json`,
    },
    {
      name: 'Orders',
      prefix: '/api/v1/orders',
      docUrl: `${getServiceHttpUrl('order')}/docs-json`,
    },
    {
      name: 'Chats',
      prefix: '/api/v1/chats',
      docUrl: `${getServiceHttpUrl('chat')}/docs-json`,
    },
    {
      name: 'Wishlists',
      prefix: '/api/v1/wishlists',
      docUrl: `${getServiceHttpUrl('wishlist')}/docs-wishlists-json`,
    },
    {
      name: 'Matches',
      prefix: '/api/v1/matches',
      docUrl: `${getServiceHttpUrl('wishlist')}/docs-matches-json`,
    },
    {
      name: 'Reviews',
      prefix: '/api/v1/reviews',
      docUrl: `${getServiceHttpUrl('review')}/docs-json`,
    },
    {
      name: 'Profiles',
      prefix: '/api/v1/profiles',
      docUrl: `${getServiceHttpUrl('moderation')}/docs-profiles-json`,
    },
    {
      name: 'Moderation',
      prefix: '/api/v1/moderation',
      docUrl: `${getServiceHttpUrl('moderation')}/docs-moderation-json`,
    },
    {
      name: 'Notifications',
      prefix: '/api/v1/notifications',
      docUrl: `${getServiceHttpUrl('notification')}/docs-json`,
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
          'Merged OpenAPI spec aggregated from all downstream services via the API Gateway. ' +
          'For internal service-to-service gRPC APIs, see /api/v1/docs-grpc.',
      },
      paths,
      components: { schemas },
    };
  }
}
