import { HubSpotService } from '@modules/hubspot/hubspot.service';
import { MocaService } from '@modules/moca/moca.service';
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

export type ResponseMocaWebHook = {
  status: boolean;
  action: string;
  id?: string | null;
  date?: number;
  message?: string;
};

/**
 * Controller for Moca webhook endpoints
 * Responsibility: HTTP layer only - route handling, guards, validation
 * Business logic is delegated to HubSpotService
 */
@Controller('moca')
@UseGuards(MocaSignatureGuard)
export class SyncController {
  private readonly handlers: Record<
    string,
    (payload: MocaWebhookEventDto) => Promise<ResponseMocaWebHook>
  >;

  constructor(
    private readonly logger: LoggerService,
    private readonly hubSpotService: HubSpotService,
    private readonly mocaService: MocaService,
  ) {
    this.logger.setContext('SyncController');
    this.handlers = {
      POST: this.createContact.bind(this),
      PATCH: this.updateContact.bind(this),
      DELETE: this.deleteContact.bind(this),
    };
  }

  /**
   * Endpoint to receive Moca contact webhooks
   * POST /moca/sync
   *
   * Protected by MocaSignatureGuard for security
   * Validates payload structure with MocaWebhookEventDto
   * Moca sends an array of events
   *
   * @param payload - Array of webhook events from Moca
   * @returns Success response
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async handleHubSpotWebhook(
    @Body(
      new ParseArrayPipe({
        items: MocaWebhookEventDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    payload: MocaWebhookEventDto[],
  ): Promise<ResponseMocaWebHook> {
    this.logger.log(`Received HubSpot webhook with ${payload.length} event(s)`);
    this.logger.debug(`Webhook payload: ${JSON.stringify(payload)}`);

    let response = {} as ResponseMocaWebHook;

    for (const currentPayload of payload) {
      this.logger.debug(`Processing event: ${JSON.stringify(currentPayload)}`);
      const handler = this.handlers[currentPayload?.action];

      if (handler) {
        response = await handler(currentPayload);
      } else {
        this.logger.warn(
          `Unhandled subscription action: ${currentPayload?.action}`,
        );
        throw new HttpException(
          'Non supported action',
          HttpStatus.BAD_REQUEST,
        );
      }
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
      action: currentPayload?.action,
      id: contactIdCreated,
      date: Date.now(),
    };
  }

  async updateContact(
    currentPayload: MocaWebhookEventDto,
  ): Promise<ResponseMocaWebHook> {
    if (!currentPayload.objectId) {
      this.logger.warn(
        `Missing objectId in payload: ${JSON.stringify(currentPayload)}`,
      );
      throw new HttpException(
        'Contact must have an objectId!',
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
    const formattedProperties = {
      ...currentPayload.properties,
      email: isEmailExisting.email,
    };

    const contactUpdated = await this.hubSpotService.updateContact(
      currentPayload.objectId,
      formattedProperties,
    );

    return {
      status: contactUpdated ? true : false,
      action: currentPayload?.action,
      id: contactUpdated,
      date: Date.now(),
    };
  }

  async deleteContact(
    currentPayload: MocaWebhookEventDto,
  ): Promise<ResponseMocaWebHook> {
    if (!currentPayload.objectId) {
      this.logger.warn(
        `Missing objectId in payload: ${JSON.stringify(currentPayload)}`,
      );
      throw new HttpException(
        'Contact must have an objectId for deletion!',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    this.logger.log(`Deleting contact: ${currentPayload.objectId}`);

    const contactExists = await this.hubSpotService.getContactById(
      currentPayload.objectId,
    );

    if (!contactExists) {
      throw new HttpException(
        'Contact does not exist in HubSpot!',
        HttpStatus.NOT_FOUND,
      );
    }

    const deleted = await this.hubSpotService.deleteContact(
      currentPayload.objectId,
    );

    return {
      status: deleted,
      action: currentPayload?.action,
      id: currentPayload.objectId,
      date: Date.now(),
      message: deleted
        ? 'Contact deleted successfully'
        : 'Failed to delete contact',
    };
  }

  /**
   * Health check endpoint for webhooks
   * GET /moca/check-app-api
   */
  @Post('check-app-api')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{ status: string; }> {
    const response = await this.mocaService.ping();
    return { status: response ? 'ok' : 'unavailable' };
  }

  /**
   * Health check endpoint for webhooks
   * GET /moca/check-hubspot-api
   */
  @Post('check-hubspot-api')
  @HttpCode(HttpStatus.OK)
  async healthCheckHubSpotApi(): Promise<{ status: string }> {
    try {
      const response = await this.hubSpotService.checkHubSpotStatus();
      return { status: response ? 'ok' : 'unavailable' };
    } catch (error) {
      this.logger.error('HubSpot API health check failed', error);
      throw new HttpException(
        'HubSpot API is not available',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
