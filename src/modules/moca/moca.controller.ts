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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiSecurity,
  ApiHeader,
} from '@nestjs/swagger';
import { MocaSignatureGuard } from '@/common/guards/moca-signature.guard';
import { LoggerService } from '../../shared/services/logger.service';
import { MocaWebhookEventDto } from './dto/moca-webhook.dto';
import {
  MOCA_SIGNATURE_HEADER,
  COMMON_RESPONSES,
  WEBHOOK_SYNC_OPERATION,
  WEBHOOK_SYNC_BODY,
  CHECK_MOCA_API_OPERATION,
  CHECK_HUBSPOT_API_OPERATION,
} from './documentation/swagger-doc';

export type ResponseMocaWebHook = {
  status: boolean;
  action: string;
  id?: string;
  date: number;
  message?: string;
};

/**
 * Controller for Moca webhook endpoints
 * Responsibility: HTTP layer only - route handling, guards, validation
 * Business logic is delegated to HubSpotService
 */
@ApiTags('Moca-HubSpot Integration')
@ApiSecurity('moca-signature')
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
      POST: this.createContact.bind(this) as (
        payload: MocaWebhookEventDto,
      ) => Promise<ResponseMocaWebHook>,
      PATCH: this.updateContact.bind(this) as (
        payload: MocaWebhookEventDto,
      ) => Promise<ResponseMocaWebHook>,
      DELETE: this.deleteContact.bind(this) as (
        payload: MocaWebhookEventDto,
      ) => Promise<ResponseMocaWebHook>,
      GET: this.SearchContactByEmail.bind(this) as (
        payload: MocaWebhookEventDto,
      ) => Promise<ResponseMocaWebHook>,
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
  @ApiOperation(WEBHOOK_SYNC_OPERATION)
  @ApiHeader(MOCA_SIGNATURE_HEADER)
  @ApiBody(WEBHOOK_SYNC_BODY)
  @ApiResponse(COMMON_RESPONSES.SUCCESS_200)
  @ApiResponse(COMMON_RESPONSES.BAD_REQUEST_400)
  @ApiResponse(COMMON_RESPONSES.NOT_FOUND_404)
  @ApiResponse(COMMON_RESPONSES.CONFLICT_409)
  @ApiResponse(COMMON_RESPONSES.PRECONDITION_FAILED_412)
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

    let response = {} as ResponseMocaWebHook;

    for (const currentPayload of payload) {
      this.logger.log(
        `\n\nEVENT: ${currentPayload.eventId} --- ACTION : ${currentPayload.action}`,
      );
      const handler = this.handlers[currentPayload?.action];

      if (handler) {
        response = await handler(currentPayload);
      } else {
        this.logger.warn(
          `Unhandled subscription action: ${currentPayload?.action}`,
        );
        throw new HttpException('Non supported action', HttpStatus.BAD_REQUEST);
      }
      this.logger.log(`END EVENT: ${currentPayload.eventId}`);
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
   * POST /moca/check-app-api
   */
  @ApiOperation(CHECK_MOCA_API_OPERATION)
  @ApiHeader(MOCA_SIGNATURE_HEADER)
  @ApiResponse(COMMON_RESPONSES.HEALTH_CHECK_SUCCESS)
  @Post('check-app-api')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.mocaService.ping();
    return { status: response ? 'ok' : 'unavailable' };
  }

  /**
   * Health check endpoint for webhooks
   * POST /moca/check-hubspot-api
   */
  @ApiOperation(CHECK_HUBSPOT_API_OPERATION)
  @ApiHeader(MOCA_SIGNATURE_HEADER)
  @ApiResponse(COMMON_RESPONSES.HEALTH_CHECK_SUCCESS)
  @ApiResponse(COMMON_RESPONSES.SERVICE_UNAVAILABLE_503)
  @Post('check-hubspot-api')
  @HttpCode(HttpStatus.OK)
  async healthCheckHubSpotApi(): Promise<{ status: string }> {
    try {
      const response = await this.hubSpotService.checkHubSpotStatus();
      return { status: response ? 'ok' : 'unavailable' };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      this.logger.error('HubSpot API health check failed', errorMessage);
      throw new HttpException(
        'HubSpot API is not available',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  async SearchContactByEmail(
    currentPayload: MocaWebhookEventDto,
  ): Promise<ResponseMocaWebHook> {
    try {
      const response = await this.hubSpotService.searchContactByEmail(
        currentPayload.emailSearch,
      );
      return {
        status: response ? true : false,
        action: currentPayload?.action,
        id: response ? response : undefined,
        date: Date.now(),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      this.logger.error('HubSpot API health check failed', errorMessage);
      throw new HttpException(
        'HubSpot API is not available',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
