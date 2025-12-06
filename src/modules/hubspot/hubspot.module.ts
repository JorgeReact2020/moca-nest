import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HubSpotService } from './hubspot.service';
import { LoggerService } from '../../shared/services/logger.service';

/**
 * Module for HubSpot API integration
 */
@Module({
  imports: [ConfigModule],
  providers: [HubSpotService, LoggerService],
  exports: [HubSpotService],
})
export class HubSpotModule {}
