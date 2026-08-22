import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    '/api/v1/docs',
    apiReference({
      url: '/api/v1/openapi.json',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
