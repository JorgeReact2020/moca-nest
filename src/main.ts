import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { useContainer } from 'class-validator';
import * as crypto from 'crypto';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { LoggerService } from './shared/services/logger.service';

// Polyfill for Node.js crypto in global scope (needed for TypeORM)
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: crypto,
    writable: true,
    configurable: true,
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Enable DI for class-validator
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Enable global exception filter with correlation ID support
  const logger = app.get(LoggerService);
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      forbidUnknownValues: true, // Forbid unknown values
      stopAtFirstError: false, // Show all validation errors
      enableDebugMessages: true, // Enable debug messages
      validationError: {
        target: false, // Don't expose the entire object in errors
        value: false, // Don't expose values in errors (security)
      },
    }),
  );

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('Moca Integration API with HubSSpot')
    .setDescription(
      'API for synchronizing contacts between Moca and HubSpot via Supabase webhooks',
    )
    .setVersion('1.0')
    .addTag('Moca Integration', 'Endpoints for Moca webhook integration')
    .addSecurity('supabase-signature', {
      type: 'apiKey',
      in: 'header',
      name: 'x-supabase-signature',
      description: 'Supabase webhook signature for request verification',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<string>('config.port') || 3000;
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
