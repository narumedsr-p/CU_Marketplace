import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { connect } from 'amqp-connection-manager';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SERVICE_PORTS, getRabbitMqUrl, QUEUES, getRetryableQueueOptions } from '@workspace/contracts';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

// Shared secrets (e.g. INTERNAL_SERVICE_SECRET) live in the repo-root .env so they aren't
// duplicated per service; this service's own .env still supplies its local overrides.
expand(config({ path: join(__dirname, '../../../.env') }));
expand(config());

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder().setTitle('Notification Service').setVersion('1.0').build();
  const document = SwaggerModule.createDocument(app, config);
  app.getHttpAdapter().get('/docs-json', (_req, res) => res.json(document));
  app.use('/docs', apiReference({ url: '/docs-json' }));

  // The retry and DLQ queues have no NestJS @EventPattern consumer of their own — the
  // retry queue is a pure TTL delay buffer and the DLQ is an inspection-only sink — so
  // nothing else asserts them into existence. Do it here before the main queue starts
  // consuming, since a nacked message needs both to already exist.
  const rabbitConnection = connect([getRabbitMqUrl()]);
  const topologyChannel = rabbitConnection.createChannel({
    setup: (channel: import('amqplib').ConfirmChannel) =>
      Promise.all([
        channel.assertQueue(QUEUES.notificationRetry, {
          durable: true,
          arguments: {
            'x-message-ttl': 10000,
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': QUEUES.notification,
          },
        }),
        channel.assertQueue(QUEUES.notificationDlq, { durable: true }),
      ]),
  });
  await topologyChannel.waitForConnect();

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [getRabbitMqUrl()],
      queue: QUEUES.notification,
      queueOptions: getRetryableQueueOptions(QUEUES.notificationRetry),
      noAck: false,
    },
  });
  await app.startAllMicroservices();

  await app.listen(process.env.NOTIFICATION_PORT ?? SERVICE_PORTS.notification.http);
}
bootstrap();
