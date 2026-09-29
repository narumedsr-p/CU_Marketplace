import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SERVICE_PORTS } from '@workspace/contracts';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AutoMatchModule } from './match/auto-match.module';

// Shared secrets (e.g. INTERNAL_SERVICE_SECRET) live in the repo-root .env so they aren't
// duplicated per service; this service's own .env still supplies its local overrides.
expand(config({ path: join(__dirname, '../../../.env') }));
expand(config());

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const wishlistsConfig = new DocumentBuilder()
    .setTitle('Wishlist Service - Wishlists')
    .setVersion('1.0')
    .build();
  const wishlistsDoc = SwaggerModule.createDocument(app, wishlistsConfig, {
    include: [WishlistModule],
  });
  app.getHttpAdapter().get('/docs-wishlists-json', (_req, res) => res.json(wishlistsDoc));
  app.use('/docs-wishlists', apiReference({ url: '/docs-wishlists-json' }));

  const matchesConfig = new DocumentBuilder()
    .setTitle('Wishlist Service - Matches')
    .setVersion('1.0')
    .build();
  const matchesDoc = SwaggerModule.createDocument(app, matchesConfig, {
    include: [AutoMatchModule],
  });
  app.getHttpAdapter().get('/docs-matches-json', (_req, res) => res.json(matchesDoc));
  app.use('/docs-matches', apiReference({ url: '/docs-matches-json' }));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'wishlist',
      protoPath: join(__dirname, '../../../libs/contracts/proto/wishlist.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT ?? SERVICE_PORTS.wishlist.grpc}`,
    },
  });
  await app.startAllMicroservices();

  await app.listen(process.env.PORT ?? SERVICE_PORTS.wishlist.http);
}
bootstrap();
