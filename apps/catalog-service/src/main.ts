import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder().setTitle('Catalog Service').setVersion('1.0').build();
  const document = SwaggerModule.createDocument(app, config);
  app.getHttpAdapter().get('/docs-json', (_req, res) => res.json(document));
  app.use('/docs', apiReference({ url: '/docs-json' }));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'catalog',
      protoPath: join(__dirname, '../../../libs/contracts/proto/catalog.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT ?? 4001}`,
    },
  });
  await app.startAllMicroservices();

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
