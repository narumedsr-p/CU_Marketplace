import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AutoMatchModule } from './match/auto-match.module';

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

  await app.listen(process.env.PORT ?? 3004);
}
bootstrap();
