import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
//import { HubSpotSignatureGuard } from '../../common/guards/hubspot-signature.guard';
import { MocaSignatureGuard } from '@/common/guards/moca-signature.guard';
import { LoggerService } from '../../shared/services/logger.service';
import { MocaWebhookEventDto } from './dto/moca-webhook.dto';

export type ResponseMocaWebHook = {
  status: boolean;
  type: string;
  id: number;
  date: number;
};

/**
 * Controller for HubSpot webhook endpoints
 * Responsibility: HTTP layer only - route handling, guards, validation
 * Business logic is delegated to WebhookService
 */
@Controller('moca')
export class SyncController {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('SyncController');
  }

  /**
   * Endpoint to receive HubSpot contact webhooks
   * POST /webhooks/hubspot
   *
   * Protected by HubSpotSignatureGuard for security
   * Validates payload structure with HubSpotWebhookEventDto
   * HubSpot sends an array of events
   *
   * @param payload - Array of webhook events from HubSpot
   * @returns Success response
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MocaSignatureGuard)
  async handleHubSpotWebhook(
    @Body() payload: MocaWebhookEventDto[],
  ): Promise<ResponseMocaWebHook> {
    this.logger.log(`Received HubSpot webhook with ${payload.length} event(s)`);
    this.logger.debug(`Webhook payload: ${JSON.stringify(payload)}`);

    switch (payload[0]?.type) {
      case 'POST':
      case 'DELETE':
      case 'PATCH':
        return {
          status: true,
          type: payload[0]?.type,
          id: 125,
          date: Date.now(),
        };
        break;
      case 'PUT':
        return {
          status: true,
          type: payload[0]?.type,
          id: 126,
          date: Date.now(),
        };
        break;
      default:
        this.logger.warn(`Unhandled subscription type: ${payload[0]?.type}`);
        return {
          status: false,
          type: payload[0]?.type,
          id: 121,
          date: Date.now(),
        };
    }
  }

  /**
   * Health check endpoint for webhooks
   * GET /webhooks/health
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }
}
