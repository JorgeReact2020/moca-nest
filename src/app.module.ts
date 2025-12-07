import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContactsModule } from './contacts/contacts.module';
import { CompaniesModule } from './companies/companies.module';
import { DealsModule } from './deals/deals.module';
import { LineItemsModule } from './line-items/line-items.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { HubSpotModule } from './modules/hubspot/hubspot.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggerService } from './shared/services/logger.service';
import hubspotConfig from './config/hubspot.config';
import loggerConfig from './config/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [hubspotConfig, loggerConfig],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'moca_nest',
      autoLoadEntities: true,
      synchronize: true, // ⚠️ Set to false in production after initial setup
    }),
    ContactsModule,
    CompaniesModule,
    DealsModule,
    LineItemsModule,
    WebhookModule,
    HubSpotModule,
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
export class AppModule {}
