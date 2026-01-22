import { ApiBodyOptions, ApiHeaderOptions, ApiOperationOptions, ApiResponseOptions } from '@nestjs/swagger';
import { MocaWebhookEventDto } from '../dto/moca-webhook.dto';

// ============================================
// SHARED CONFIGURATION
// ============================================

export const MOCA_SIGNATURE_HEADER: ApiHeaderOptions = {
  name: 'x-moca-signature',
  description: 'SECRET ==> Required signature for webhook verification',
  required: true,
  schema: {
    type: 'string',
    example: 'c!2qHU&HnHlbn#q8%iKUIymzmGWUJ@#C45oeOyAHJUb1S',
  },
};

// ============================================
// COMMON RESPONSES
// ============================================

export const COMMON_RESPONSES = {
  SUCCESS_200: {
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'boolean', example: true },
        action: { type: 'string', example: 'POST' },
        id: { type: 'string', example: '173595202426' },
        date: { type: 'number', example: 1765043528476 },
        message: { type: 'string', example: 'Contact created successfully' },
      },
    },
  } as ApiResponseOptions,

  BAD_REQUEST_400: {
    status: 400,
    description: 'Invalid action or malformed request',
  } as ApiResponseOptions,

  NOT_FOUND_404: {
    status: 404,
    description: 'Contact not found in HubSpot',
  } as ApiResponseOptions,

  CONFLICT_409: {
    status: 409,
    description: 'Email already exists in HubSpot',
  } as ApiResponseOptions,

  PRECONDITION_FAILED_412: {
    status: 412,
    description: 'Precondition failed - missing required fields',
  } as ApiResponseOptions,

  SERVICE_UNAVAILABLE_503: {
    status: 503,
    description: 'Service is not available',
  } as ApiResponseOptions,

  HEALTH_CHECK_SUCCESS: {
    status: 200,
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ok', 'unavailable'],
          example: 'ok',
        },
      },
    },
  } as ApiResponseOptions,
};

// ============================================
// WEBHOOK SYNC ENDPOINT
// ============================================

export const WEBHOOK_SYNC_OPERATION: ApiOperationOptions = {
  summary: 'Receive Moca webhook events',
  description:
    'Processes webhook events from Moca for contact synchronization with HubSpot. Supports POST (create), PATCH (update), DELETE (remove), and GET (search) actions. Requires x-moca-signature header for authentication and appId in the payload for all CONTACT actions.',
};

export const WEBHOOK_SYNC_BODY: ApiBodyOptions = {
  type: [MocaWebhookEventDto],
  description: 'Array of webhook events from Moca',
  examples: {
    createContact: {
      summary: 'Create Contact Event',
      value: [
        {
          eventId: 714285774,
          appId: '25681700',
          occurredAt: 1765043528476,
          action: 'POST',
          objectType: 'CONTACT',
          attemptNumber: 0,
          properties: {
            firstname: 'John',
            lastname: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
          },
        },
      ],
    },
    updateContact: {
      summary: 'Update Contact Event',
      value: [
        {
          eventId: 714285775,
          appId: '25681700',
          occurredAt: 1765043528476,
          action: 'PATCH',
          objectType: 'CONTACT',
          attemptNumber: 0,
          objectId: '173595202426',
          properties: {
            firstname: 'Jane',
            lastname: 'Smith',
          },
        },
      ],
    },
    deleteContact: {
      summary: 'Delete Contact Event',
      value: [
        {
          eventId: 714285776,
          appId: '25681700',
          occurredAt: 1765043528476,
          action: 'DELETE',
          objectType: 'CONTACT',
          attemptNumber: 0,
          objectId: '173595202426',
        },
      ],
    },
    searchContact: {
      summary: 'Search Contact Event',
      value: [
        {
          eventId: 714285777,
          appId: '25681700',
          occurredAt: 1765043528476,
          action: 'GET',
          objectType: 'CONTACT',
          attemptNumber: 0,
          emailSearch: 'john.doe@example.com',
        },
      ],
    },
  },
};

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

export const CHECK_MOCA_API_OPERATION: ApiOperationOptions = {
  summary: 'Check Moca API health',
  description: 'Verifies connectivity to the Moca API service',
};

export const CHECK_HUBSPOT_API_OPERATION: ApiOperationOptions = {
  summary: 'Check HubSpot API health',
  description: 'Verifies connectivity to the HubSpot API service',
};
