import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CorrelationIdMiddleware } from './common/middleware';
import AppConfig from './config/app.config';
import hubspotConfig from './config/hubspot.config';
import loggerConfig from './config/logger.config';
import mocaConfig from './config/moca.config';
import { HubSpotModule } from './modules/hubspot/hubspot.module';
import { MocaModule } from './modules/moca/moca.module';
import { LoggerService } from './shared/services/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [hubspotConfig, loggerConfig, mocaConfig, AppConfig],
    }),

    HubSpotModule,
    MocaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
