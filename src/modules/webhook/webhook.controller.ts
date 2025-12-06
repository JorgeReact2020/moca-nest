import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { HubSpotWebhookEventDto } from './dto/hubspot-webhook.dto';
import { HubSpotSignatureGuard } from '../../common/guards/hubspot-signature.guard';
import { LoggerService } from '../../shared/services/logger.service';

/**
 * Controller for HubSpot webhook endpoints
 * Responsibility: HTTP layer only - route handling, guards, validation
 * Business logic is delegated to WebhookService
 */
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('WebhookController');
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
  @Post('hubspot')
  @HttpCode(HttpStatus.OK)
  @UseGuards(HubSpotSignatureGuard)
  async handleHubSpotWebhook(
    @Body() payload: HubSpotWebhookEventDto[],
  ): Promise<{ status: string; message: string; processed: number }> {
    this.logger.log(`Received HubSpot webhook with ${payload.length} event(s)`);
    this.logger.debug(`Webhook payload: ${JSON.stringify(payload)}`);

    // Delegate business logic to service layer
    const processed = await this.webhookService.processContactWebhook(payload);

    this.logger.log(`Webhook processed successfully: ${processed} event(s)`);

    return {
      status: 'success',
      message: 'Webhook processed',
      processed,
    };
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
