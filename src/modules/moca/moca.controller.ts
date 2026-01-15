import { HubSpotService } from '@modules/hubspot/hubspot.service';
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  ParseArrayPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
//import { HubSpotSignatureGuard } from '../../common/guards/hubspot-signature.guard';
import { MocaSignatureGuard } from '@/common/guards/moca-signature.guard';
import { LoggerService } from '../../shared/services/logger.service';
import { MocaWebhookEventDto } from './dto/moca-webhook.dto';
import { MocaContactPropertiesDto } from './dto/moca-contact-properties.dto';

export type ResponseMocaWebHook = {
  status?: boolean;
  type?: string;
  id?: string | null;
  date?: number;
  message?: string;
};

/**
 * Controller for HubSpot webhook endpoints
 * Responsibility: HTTP layer only - route handling, guards, validation
 * Business logic is delegated to WebhookService
 */
@Controller('moca')
export class SyncController {
  constructor(
    private readonly logger: LoggerService,
    private readonly hubSpotService: HubSpotService,
  ) {
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
    @Body(
      new ParseArrayPipe({
        items: MocaWebhookEventDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    payload: MocaWebhookEventDto[],
  ): Promise<ResponseMocaWebHook | Record<string, unknown>> {
    this.logger.log(`Received HubSpot webhook with ${payload.length} event(s)`);
    this.logger.debug(`Webhook payload: ${JSON.stringify(payload)}`);

    let response: ResponseMocaWebHook = {};

    for (const currentPayload of payload) {
      this.logger.debug(`Processing event: ${JSON.stringify(currentPayload)}`);
      switch (currentPayload?.action) {
        case 'POST':
          response = await this.createContact(currentPayload);
          break;
        case 'PATCH':
          response = await this.updateContact(currentPayload);
          break;
        case 'DELETE':
          return {
            status: true,
            type: currentPayload?.action,
            id: '126',
            date: Date.now(),
          };
        default:
          this.logger.warn(
            `Unhandled subscription type: ${currentPayload?.action}`,
          );
          return response;
      }
      // Process each payload item here
    }
    return response;
  }

  async createContact(
    currentPayload: MocaWebhookEventDto,
  ): Promise<ResponseMocaWebHook> {
    const isContactValid = this.hubSpotService.validateContactData({
      firstname: currentPayload.properties.firstname || '',
      lastname: currentPayload.properties.lastname || '',
      email: currentPayload.properties.email,
    });

    if (!isContactValid) {
      this.logger.warn(
        `Invalid contact data: ${JSON.stringify(currentPayload.properties)}`,
      );

      throw new HttpException(
        'Contact must have at least an email!',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    const isEmailExisting = await this.hubSpotService.searchContactByEmail(
      currentPayload.properties.email,
    );

    if (isEmailExisting) {
      throw new HttpException(
        'Email already exists in HubSpot!',
        HttpStatus.CONFLICT,
      );
    }

    const contactIdCreated = await this.hubSpotService.createContact(
      currentPayload.properties,
    );

    return {
      status: contactIdCreated ? true : false,
      type: currentPayload?.action,
      id: contactIdCreated,
      date: Date.now(),
    };
  }

  async updateContact(
    currentPayload: MocaWebhookEventDto,
  ): Promise<ResponseMocaWebHook> {
    const isContactValid = currentPayload.objectId === undefined;

    if (isContactValid) {
      this.logger.warn(
        `Invalid contact data: ${JSON.stringify(currentPayload.properties)}`,
      );
      throw new HttpException(
        'Contact must have at least an objectId!',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    const isEmailExisting = await this.hubSpotService.getContactById(
      currentPayload.objectId,
    );

    if (!isEmailExisting) {
      throw new HttpException(
        'Contact does not exist in HubSpot!',
        HttpStatus.NOT_FOUND,
      );
    }
    const formattedProperties = {...currentPayload.properties, email: isEmailExisting.email};

    const contactUpdated = await this.hubSpotService.updateContact(
      currentPayload.objectId,
      formattedProperties,
    );

    return {
      status: contactUpdated ? true : false,
      type: currentPayload?.action,
      id: contactUpdated,
      date: Date.now(),
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
