import { HttpException, HttpStatus } from '@nestjs/common';

export class HubSpotApiError extends HttpException {
  constructor(
    public readonly operation: string,
    public readonly statusCode: number,
    public readonly hubspotMessage: string,
    public readonly email?: string,
    public readonly contactId?: string,
    public readonly retryable: boolean = false,
  ) {
    super(
      {
        message: `HubSpot API error during ${operation}`,
        statusCode,
        hubspotMessage,
        email,
        contactId,
        retryable,
        errorCode: 'HUBSPOT_API_ERROR',
      },
      statusCode >= 500 ? HttpStatus.BAD_GATEWAY : HttpStatus.BAD_REQUEST,
    );
  }
}
