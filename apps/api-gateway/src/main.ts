import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // dynamic import: @scalar/nestjs-api-reference's CJS build require()s an
  // ESM-only dependency, which only resolves correctly through import().
  const { apiReference } = await import('@scalar/nestjs-api-reference');
  app.use(
    '/api/v1/docs',
    apiReference({
      url: '/api/v1/openapi.json',
    }),
  );

  // Combined gRPC docs, generated from libs/contracts/proto/*.proto via
  // `pnpm docs:grpc` (protoc-gen-doc) — regenerate after editing any .proto file.
  app.getHttpAdapter().get('/api/v1/docs-grpc', (_req, res) => {
    res.sendFile(join(__dirname, '../../../libs/contracts/proto/generated/index.html'));
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
