import { IsValidAppIdConstraint } from '@/common/validators/is-valid-app-id.validator';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from '@shared/services/logger.service';
import mocaConfig from '../../config/moca.config';
import { HubSpotModule } from '../hubspot/hubspot.module';
import { SyncController } from './moca.controller';
import { MocaService } from './moca.service';

@Module({
  imports: [ConfigModule.forFeature(mocaConfig), HubSpotModule],
  providers: [MocaService, LoggerService, IsValidAppIdConstraint],
  controllers: [SyncController],
  exports: [MocaService],
})
export class MocaModule {}
