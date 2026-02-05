import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CorrelationIdMiddleware } from './common/middleware';
import { CompaniesModule } from './companies/companies.module';
import AppConfig from './config/app.config';
import databaseConfig from './config/database.config';
import hubspotConfig from './config/hubspot.config';
import loggerConfig from './config/logger.config';
import mocaConfig from './config/moca.config';
import { ContactsModule } from './contacts/contacts.module';
import { DealsModule } from './deals/deals.module';
import { LineItemsModule } from './line-items/line-items.module';
import { HubSpotModule } from './modules/hubspot/hubspot.module';
import { MocaModule } from './modules/moca/moca.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { LoggerService } from './shared/services/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [
        hubspotConfig,
        loggerConfig,
        mocaConfig,
        databaseConfig,
        AppConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],

      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'), // eslint-disable-line
      }),
      inject: [ConfigService],
    }),
    ContactsModule,
    CompaniesModule,
    DealsModule,
    LineItemsModule,
    WebhookModule,
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
