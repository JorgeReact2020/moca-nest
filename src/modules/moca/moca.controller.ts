import { MocaSignatureGuard } from '@/common/guards/moca-signature.guard';
import { HubSpotService } from '@modules/hubspot/hubspot.service';
import { MocaService } from '@modules/moca/moca.service';
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { LoggerService } from '../../shared/services/logger.service';
import {
  CHECK_HUBSPOT_API_OPERATION,
  CHECK_MOCA_API_OPERATION,
  COMMON_RESPONSES,
  MOCA_SIGNATURE_HEADER,
  WEBHOOK_SYNC_BODY,
  WEBHOOK_SYNC_OPERATION,
} from './documentation/swagger-doc';
import { MocaContactPropertiesDto } from './dto/moca-contact-properties.dto';
import { SupabaseWebhookDto } from './dto/supabase-webhook.dto';

export type ResponseMocaWebHook = {
  status: boolean;
  type: string;
  id?: string;
  date: number;
  message?: string;
  code: number;
};

/**
 * Property mapping configuration
 * Maps Supabase field names to HubSpot field names
 * Add entries here when field names differ between systems
 */
const PROPERTY_MAPPING: Record<string, string> = {
  id: 'ct_moca_id_database',
};

/**
 * Allowed fields to send to HubSpot
 * Only these fields will be forwarded from Supabase to HubSpot
 */
const ALLOWED_FIELDS_FROM_SUPABASE = [
  'id',
  'email',
  'firstname',
  'lastname',
  'country',
  'ct_institution_type',
  'ct_certification_moca_id',
  'ct_opt_in_status',
  'ct_certification_date',
  'ct_free_training_type',
  'ct_certification_group',
  'ct_user_role',
  'certification_status',
];

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
    (payload: SupabaseWebhookDto) => Promise<ResponseMocaWebHook>
  >;

  constructor(
    private readonly logger: LoggerService,
    private readonly hubSpotService: HubSpotService,
    private readonly mocaService: MocaService,
  ) {
    this.logger.setContext('SyncController');
    this.handlers = {
      INSERT: this.createContact.bind(this) as (
        payload: SupabaseWebhookDto,
      ) => Promise<ResponseMocaWebHook>,
      UPDATE: this.updateContact.bind(this) as (
        payload: SupabaseWebhookDto,
      ) => Promise<ResponseMocaWebHook>,
      DELETE: this.deleteContact.bind(this) as (
        payload: SupabaseWebhookDto,
      ) => Promise<ResponseMocaWebHook>,
    };
  }

  /**
   * Transform Supabase property names to HubSpot property names
   * @param supabaseProperties - Properties from Supabase with original field names
   * @returns Transformed properties with HubSpot field names (all values as strings)
   */
  private mapPropertiesToHubSpot(
    supabaseProperties: MocaContactPropertiesDto,
  ): Record<string, string> {
    const hubspotProperties: Record<string, string> = {};

    for (const [key, value] of Object.entries(supabaseProperties)) {
      // Only process allowed fields
      if (!ALLOWED_FIELDS_FROM_SUPABASE.includes(key)) {
        continue;
      }

      // Skip undefined or null values
      if (value === undefined || value === null) {
        continue;
      }

      // Use mapped name if exists, otherwise use original name
      const hubspotKey = PROPERTY_MAPPING[key] || key;

      // Convert value to string (HubSpot expects all properties as strings)
      const stringValue = typeof value === 'string' ? value : String(value);

      hubspotProperties[hubspotKey] = stringValue;
    }

    return hubspotProperties;
  }

  /**
   * Compare two contact objects to detect changes
   * Ignores undefined/null values and only compares defined properties
   * @param oldData - Previous contact data
   * @param newData - New contact data
   * @returns true if changes detected, false otherwise
   */
  private hasContactChanges(
    oldData: MocaContactPropertiesDto | null,
    newData: MocaContactPropertiesDto,
  ): boolean {
    const keys = Object.keys(newData).filter(
      (key) =>
        key !== 'id' &&
        newData[key as keyof MocaContactPropertiesDto] !== undefined &&
        newData[key as keyof MocaContactPropertiesDto] !== null,
    );

    return keys.some((key) => {
      const oldValue = oldData?.[key as keyof MocaContactPropertiesDto];
      const newValue = newData[key as keyof MocaContactPropertiesDto];
      return oldValue !== newValue;
    });
  }

  /**
   * Endpoint to receive Supabase database webhooks
   * POST /moca/sync
   *
   * Protected by MocaSignatureGuard for security
   * Validates payload structure with SupabaseWebhookDto
   * Supabase sends a single event per webhook call
   *
   * @param payload - Single webhook event from Supabase
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
    @Body() payload: SupabaseWebhookDto,
  ): Promise<ResponseMocaWebHook> {
    this.logger.log(
      `Received Supabase webhook: ${payload.type} on ${payload.table}`,
    );

    const handler = this.handlers[payload.type];

    if (!handler) {
      this.logger.warn(`Unhandled event type: ${payload.type}`);
      throw new HttpException(
        `Event type ${payload.type} is not supported`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const response = await handler(payload);
    this.logger.log(`Completed ${payload.type} operation`);

    return response;
  }

  async createContact(
    payload: SupabaseWebhookDto,
  ): Promise<ResponseMocaWebHook> {
    if (!payload.record) {
      throw new HttpException(
        'INSERT event must have record data',
        HttpStatus.BAD_REQUEST,
      );
    }

    const contactData = payload.record;
    const email = contactData.email;

    const isContactValid = this.hubSpotService.validateContactData({
      firstname: contactData.firstname || '',
      lastname: contactData.lastname || '',
      email: contactData.email,
    });

    if (!isContactValid) {
      this.logger.warn(
        `Invalid contact data for email ${email}: missing required email field`,
      );
      throw new HttpException(
        'Contact must have at least an email!',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    // Transform Supabase properties to HubSpot properties
    const hubspotProperties = this.mapPropertiesToHubSpot(contactData);
    this.logger.log(`Creating contact in HubSpot for email: ${email}`);

    const contactIdCreated =
      await this.hubSpotService.createContact(hubspotProperties);

    this.logger.log(
      `Successfully created contact ${contactIdCreated} for email: ${email}`,
    );

    return {
      status: contactIdCreated ? true : false,
      type: payload.type,
      id: contactIdCreated,
      date: Date.now(),
      code: HttpStatus.OK,
    };
  }

  async updateContact(
    payload: SupabaseWebhookDto,
  ): Promise<ResponseMocaWebHook> {
    if (!payload.record) {
      throw new HttpException(
        'UPDATE event must have record data',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newData = payload.record;
    const oldData = payload.old_record;
    const email = newData.email;

    if (!email) {
      this.logger.warn(
        `Missing email in UPDATE payload: ${JSON.stringify(newData)}`,
      );
      throw new HttpException(
        'Contact must have an email or id!',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    this.logger.log(`Updating contact for email: ${email}`);

    // Find contact by email
    const hubspotContactId =
      await this.hubSpotService.searchContactByEmail(email);

    if (!hubspotContactId) {
      this.logger.warn(`Contact not found in HubSpot for email: ${email}`);
      throw new HttpException(
        'Contact does not exist in HubSpot!',
        HttpStatus.NOT_FOUND,
      );
    }

    // Change detection - only update if something actually changed
    if (oldData) {
      const hasChanges = this.hasContactChanges(oldData, newData);

      if (!hasChanges) {
        this.logger.log(
          `No relevant changes detected for email ${email} (HubSpot ID: ${hubspotContactId}), skipping update`,
        );
        return {
          status: true,
          type: payload.type,
          message: 'No changes detected',
          date: Date.now(),
          code: HttpStatus.OK,
        };
      }
    }

    // Transform Supabase properties to HubSpot properties
    const hubspotProperties = this.mapPropertiesToHubSpot(newData);

    const contactUpdated = await this.hubSpotService.updateContact(
      hubspotContactId,
      hubspotProperties,
    );

    this.logger.log(
      `Successfully updated contact ${contactUpdated} for email: ${email}`,
    );

    return {
      status: contactUpdated ? true : false,
      type: payload.type,
      id: contactUpdated,
      date: Date.now(),
      code: HttpStatus.OK,
    };
  }

  async deleteContact(
    payload: SupabaseWebhookDto,
  ): Promise<ResponseMocaWebHook> {
    if (!payload.old_record) {
      throw new HttpException(
        'DELETE event must have old_record data',
        HttpStatus.BAD_REQUEST,
      );
    }

    const oldData = payload.old_record;
    const email = oldData.email;

    if (!email) {
      this.logger.warn(
        `Missing email in DELETE old_record: ${JSON.stringify(oldData)}`,
      );
      throw new HttpException(
        'Contact must have an email or id for deletion!',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    this.logger.log(`Deleting contact with email: ${email}`);

    // Find contact by email
    const hubspotContactId =
      await this.hubSpotService.searchContactByEmail(email);

    if (!hubspotContactId) {
      this.logger.warn(
        `Contact not found in HubSpot for deletion, email: ${email}`,
      );
      throw new HttpException(
        'Contact does not exist in HubSpot!',
        HttpStatus.NOT_FOUND,
      );
    }

    const deleted = await this.hubSpotService.deleteContact(hubspotContactId);

    this.logger.log(
      `Successfully deleted contact ${hubspotContactId} for email: ${email}`,
    );

    return {
      status: deleted,
      type: payload.type,
      id: hubspotContactId,
      date: Date.now(),
      message: deleted
        ? 'Contact deleted successfully'
        : 'Failed to delete contact',
      code: HttpStatus.OK,
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
}
