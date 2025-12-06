import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { Contact } from '../../contacts/contact.entity';
import { HubSpotModule } from '../hubspot/hubspot.module';
import { LoggerService } from '../../shared/services/logger.service';
import { HubSpotSignatureGuard } from '../../common/guards/hubspot-signature.guard';

/**
 * Module for handling HubSpot webhooks
 * Wires together controller, service, guards, and dependencies
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Contact]), HubSpotModule],
  controllers: [WebhookController],
  providers: [WebhookService, LoggerService, HubSpotSignatureGuard],
})
export class WebhookModule {}
