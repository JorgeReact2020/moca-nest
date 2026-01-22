import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Enable DI for class-validator
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      forbidUnknownValues: true, // Forbid unknown values
      stopAtFirstError: true, // Stop validation on the first error
      enableDebugMessages: true, // Enable debug messages
    }),
  );

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('Moca-NestJS Integration API')
    .setDescription(
      'API for synchronizing contacts between Moca and HubSpot via webhooks',
    )
    .setVersion('1.0')
    .addTag('Moca Integration', 'Endpoints for Moca webhook integration')
    .addSecurity('moca-signature', {
      type: 'apiKey',
      in: 'header',
      name: 'X-Moca-Signature',
      description: 'Moca webhook signature for request verification',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<string>('config.port') || 3000;
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
