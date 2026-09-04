import 'dotenv/config';
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
