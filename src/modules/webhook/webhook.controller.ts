import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HubSpotSignatureGuard } from '../../common/guards/hubspot-signature.guard';
import { LoggerService } from '../../shared/services/logger.service';
import { HubSpotWebhookEventDto } from './dto/hubspot-webhook.dto';
import { WebhookService } from './webhook.service';

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
    let processed = 0;

    switch (payload[0]?.subscriptionType) {
      case 'contact.creation':
      case 'contact.propertyChange':
      case 'contact.deletion':
        processed = await this.webhookService.processContactWebhook(payload);
        this.logger.log('Processing contact webhook event(s)');
        break;
      case 'deal.creation':
      case 'deal.propertyChange':
        processed =
          await this.webhookService.processDealCreationWebhook(payload);
        this.logger.log('Processing deal creation webhook event(s)');
        break;
      default:
        this.logger.warn(
          `Unhandled subscription type: ${payload[0]?.subscriptionType}`,
        );
        return {
          status: 'ignored',
          message: `No processing for subscription type: ${payload[0]?.subscriptionType}`,
          processed: 0,
        };
    }

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
