import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MocaService } from './moca.service';
import mocaConfig from '../../config/moca.config';
import { LoggerService } from '@shared/services/logger.service';
import { SyncController } from './moca.controller';
import { HubSpotModule } from '../hubspot/hubspot.module';
import { IsValidAppIdConstraint } from '@/common/validators/is-valid-app-id.validator';

@Module({
  imports: [ConfigModule.forFeature(mocaConfig), HubSpotModule],
  providers: [MocaService, LoggerService, IsValidAppIdConstraint],
  controllers: [SyncController],
  exports: [MocaService],
})
export class MocaModule {}
