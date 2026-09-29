import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SERVICE_PORTS, getRabbitMqUrl, QUEUES } from '@workspace/contracts';
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

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [getRabbitMqUrl()],
      queue: QUEUES.notification,
      queueOptions: { durable: true },
    },
  });
  await app.startAllMicroservices();

  await app.listen(process.env.PORT ?? SERVICE_PORTS.notification.http);
}
bootstrap();
