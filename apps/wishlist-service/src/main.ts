import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { join } from 'path';
import { connect } from 'amqp-connection-manager';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SERVICE_PORTS, QUEUES, getRabbitMqUrl, getRetryableQueueOptions } from '@workspace/contracts';
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

  // The retry and DLQ queues have no NestJS @EventPattern consumer of their own — the
  // retry queue is a pure TTL delay buffer and the DLQ is an inspection-only sink — so
  // nothing else asserts them into existence. Do it here before the main queue starts
  // consuming, since a nacked message needs both to already exist.
  const rabbitConnection = connect([getRabbitMqUrl()]);
  const topologyChannel = rabbitConnection.createChannel({
    setup: (channel: import('amqplib').ConfirmChannel) =>
      Promise.all([
        channel.assertQueue(QUEUES.wishlistEvaluateRetry, {
          durable: true,
          arguments: {
            'x-message-ttl': 10000,
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': QUEUES.wishlistEvaluate,
          },
        }),
        channel.assertQueue(QUEUES.wishlistEvaluateDlq, { durable: true }),
      ]),
  });
  await topologyChannel.waitForConnect();

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [getRabbitMqUrl()],
      queue: QUEUES.wishlistEvaluate,
      queueOptions: getRetryableQueueOptions(QUEUES.wishlistEvaluateRetry),
      noAck: false,
    },
  });
  await app.startAllMicroservices();

  await app.listen(process.env.PORT ?? SERVICE_PORTS.wishlist.http);
}
bootstrap();
