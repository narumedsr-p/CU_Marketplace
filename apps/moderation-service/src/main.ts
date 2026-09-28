import { config } from 'dotenv';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SERVICE_PORTS } from '@workspace/contracts';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ReportsModule } from './reports/reports.module';
import { ModerationModule } from './moderation/moderation.module';

// Shared secrets (e.g. INTERNAL_SERVICE_SECRET) live in the repo-root .env so they aren't
// duplicated per service; this service's own .env still supplies its local overrides.
config({ path: join(__dirname, '../../../.env') });
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const profilesConfig = new DocumentBuilder()
    .setTitle('Moderation Service - Profiles')
    .setVersion('1.0')
    .build();
  const profilesDoc = SwaggerModule.createDocument(app, profilesConfig, {
    include: [ProfilesModule],
  });
  app.getHttpAdapter().get('/docs-profiles-json', (_req, res) => res.json(profilesDoc));
  app.use('/docs-profiles', apiReference({ url: '/docs-profiles-json' }));

  const moderationConfig = new DocumentBuilder()
    .setTitle('Moderation Service - Reports & Moderation')
    .setVersion('1.0')
    .build();
  const moderationDoc = SwaggerModule.createDocument(app, moderationConfig, {
    include: [ReportsModule, ModerationModule],
  });
  app.getHttpAdapter().get('/docs-moderation-json', (_req, res) => res.json(moderationDoc));
  app.use('/docs-moderation', apiReference({ url: '/docs-moderation-json' }));

  await app.listen(process.env.PORT ?? SERVICE_PORTS.moderation.http);
}
bootstrap();
