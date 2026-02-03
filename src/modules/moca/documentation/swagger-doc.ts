import {
  ApiBodyOptions,
  ApiHeaderOptions,
  ApiOperationOptions,
  ApiResponseOptions,
} from '@nestjs/swagger';
import { SupabaseWebhookDto } from '../dto/supabase-webhook.dto';

// ============================================
// SHARED CONFIGURATION
// ============================================

export const MOCA_SIGNATURE_HEADER: ApiHeaderOptions = {
  name: 'x-supabase-signature',
  description:
    'Required signature for webhook verification (optional if MOCA_WEBHOOK_SECRET not configured)',
  required: false,
  schema: {
    type: 'string',
    example: 'sha256=abc123...',
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
        type: { type: 'string', example: 'INSERT' },
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
  summary: 'Receive Supabase database webhook events',
  description:
    'Processes database webhook events from Supabase for contact synchronization with HubSpot. ' +
    'Supports INSERT (create), UPDATE (update with change detection), and DELETE (remove) events. ' +
    'Automatically adds source_system: "parkour3" to all HubSpot contacts to prevent webhook loops. ' +
    'UPDATE events only trigger HubSpot updates if properties have actually changed. ',
};

export const WEBHOOK_SYNC_BODY: ApiBodyOptions = {
  type: SupabaseWebhookDto,
  description: 'Supabase database webhook event payload',
  examples: {
    createContact: {
      summary: 'INSERT Event - Create Contact',
      value: {
        type: 'INSERT',
        table: 'Profil',
        schema: 'public',
        record: {
          id: 45,
          firstname: 'John',
          lastname: 'Doe',
          email: 'john.doe@example.com',
        },
        old_record: null,
      },
    },
    updateContact: {
      summary: 'UPDATE Event - Update Contact',
      value: {
        type: 'UPDATE',
        table: 'Profil',
        schema: 'public',
        record: {
          id: 45,
          firstname: 'Jane',
          lastname: 'Smith',
          email: 'john.doe@example.com',
        },
        old_record: {
          id: 45,
          firstname: 'John',
          lastname: 'Doe',
          email: 'john.doe@example.com',
        },
      },
    },
    deleteContact: {
      summary: 'DELETE Event - Remove Contact',
      value: {
        type: 'DELETE',
        table: 'Profil',
        schema: 'public',
        record: null,
        old_record: {
          id: 45,
          firstname: 'John',
          lastname: 'Doe',
          email: 'john.doe@example.com',
        },
      },
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
