import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { Contact } from '@contacts/contact.entity';
import { Company } from '@companies/company.entity';
import { Deal } from '@deals/deal.entity';
import { LineItem } from '@line-items/line-item.entity';
import { HubSpotModule } from '@modules/hubspot/hubspot.module';
import { MocaModule } from '@modules/moca/moca.module';
import { LoggerService } from '@shared/services/logger.service';
import { HubSpotSignatureGuard } from '@common/guards/hubspot-signature.guard';

/**
 * Module for handling HubSpot webhooks
 * Wires together controller, service, guards, and dependencies
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Contact, Company, Deal, LineItem]),
    HubSpotModule,
    MocaModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, LoggerService, HubSpotSignatureGuard],
})
export class WebhookModule {}
