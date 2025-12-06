import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@hubspot/api-client';
import { LoggerService } from '../../shared/services/logger.service';

/**
 * Interface for HubSpot contact data
 */
export interface HubSpotContactData {
  firstname: string;
  lastname: string;
  email: string;
}

/**
 * Service responsible for HubSpot API integration
 * Handles fetching contact data with retry logic and rate limit handling
 */
@Injectable()
export class HubSpotService {
  private hubspotClient: Client;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('HubSpotService');
    this.initializeClient();
  }

  /**
   * Initialize HubSpot API client
   */
  private initializeClient(): void {
    const apiKey = this.configService.get<string>('hubspot.apiKey');

    if (!apiKey) {
      this.logger.warn('HubSpot API key not configured');
    }

    this.hubspotClient = new Client({ accessToken: apiKey });
    this.retryAttempts = this.configService.get<number>(
      'hubspot.retryAttempts',
      3,
    );
    this.retryDelay = this.configService.get<number>(
      'hubspot.retryDelay',
      1000,
    );

    this.logger.log('HubSpot client initialized');
  }

  /**
   * Fetch contact details from HubSpot by contact ID
   * Implements exponential backoff retry logic
   *
   * @param contactId - HubSpot contact ID (objectId)
   * @returns Contact data with firstname, lastname, email
   * @throws HttpException if contact not found or API fails after retries
   */
  async getContactById(contactId: string): Promise<HubSpotContactData> {
    this.logger.log(`Fetching contact from HubSpot: ${contactId}`);

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const contact = await this.hubspotClient.crm.contacts.basicApi.getById(
          contactId,
          ['firstname', 'lastname', 'email'],
        );

        const contactData: HubSpotContactData = {
          firstname: contact.properties.firstname || '',
          lastname: contact.properties.lastname || '',
          email: contact.properties.email || '',
        };

        this.logger.log(`Successfully fetched contact ${contactId}`);
        this.logger.debug(`Contact email: ${contactData.email}`);

        return contactData;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${attempt}/${this.retryAttempts} failed for contact ${contactId}: ${error.message}`,
        );

        // Handle rate limiting (429)
        if (error.response?.status === 429) {
          const retryAfter = error.response?.headers?.['retry-after'];
          const waitTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff

          this.logger.warn(`Rate limited. Waiting ${waitTime}ms before retry`);

          await this.sleep(waitTime);
          continue;
        }

        // Handle not found (404)
        if (error.response?.status === 404) {
          this.logger.error(`Contact not found in HubSpot: ${contactId}`);
          throw new HttpException(
            `Contact ${contactId} not found in HubSpot`,
            HttpStatus.NOT_FOUND,
          );
        }

        // Retry with exponential backoff for other errors
        if (attempt < this.retryAttempts) {
          const waitTime = this.retryDelay * Math.pow(2, attempt - 1);
          this.logger.log(`Retrying in ${waitTime}ms...`);
          await this.sleep(waitTime);
        }
      }
    }

    // All retries failed
    this.logger.error(
      `Failed to fetch contact ${contactId} after ${this.retryAttempts} attempts`,
      lastError?.stack || 'No error details',
    );

    throw new HttpException(
      'Failed to fetch contact from HubSpot after multiple retries',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate that contact has required fields
   */
  validateContactData(data: HubSpotContactData): boolean {
    if (!data.email) {
      this.logger.error(
        `Contact missing required email field. Data: ${JSON.stringify(data)}`,
      );
      return false;
    }
    return true;
  }
}
