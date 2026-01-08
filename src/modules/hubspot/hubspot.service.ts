import hubspotConfig from '@/config/hubspot.config';
import { Client } from '@hubspot/api-client';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
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
    @Inject(hubspotConfig.KEY)
    private hubSpotKeys: ConfigType<typeof hubspotConfig>,
    private logger: LoggerService,
  ) {
    this.logger.setContext('HubSpotService');
    this.initializeClient();
  }

  /**
   * Initialize HubSpot API client
   */
  private initializeClient(): void {
    const apiKey = this.hubSpotKeys.apiKey;

    if (!apiKey) {
      this.logger.warn('HubSpot API key not configured');
    }

    this.hubspotClient = new Client({ accessToken: apiKey });
    this.retryAttempts = this.hubSpotKeys.retryAttempts;
    this.retryDelay = this.hubSpotKeys.retryDelay;

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
      } catch (error: unknown) {
        lastError = error as Error;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Attempt ${attempt}/${this.retryAttempts} failed for contact ${contactId}: ${errorMessage}`,
        );

        // Handle rate limiting (429)
        const errorResponse = error as {
          response?: { status?: number; headers?: Record<string, string> };
        };
        if (errorResponse.response?.status === 429) {
          const retryAfter = errorResponse.response?.headers?.['retry-after'];
          const waitTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff

          this.logger.warn(`Rate limited. Waiting ${waitTime}ms before retry`);

          await this.sleep(waitTime);
          continue;
        }

        // Handle not found (404)
        if (errorResponse.response?.status === 404) {
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

  /**
   * Get companies associated with a contact
   * @param contactId - HubSpot contact ID
   * @returns Array of company HubSpot IDs
   */
  async getContactCompanies(contactId: string): Promise<string[]> {
    this.logger.log(`Fetching companies for contact: ${contactId}`);

    try {
      const response = await this.hubspotClient.crm.associations.batchApi.read(
        'contacts',
        'companies',
        { inputs: [{ id: contactId }] },
      );

      const companyIds = response.results.flatMap((result) =>
        result.to.map((assoc) => assoc.id),
      );
      this.logger.log(
        `Found ${companyIds.length} companies for contact ${contactId}`,
      );

      return companyIds;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to fetch companies for contact ${contactId}: ${errorMessage}`,
      );
      return []; // Return empty array if associations fail
    }
  }

  /**
   * Get company details by HubSpot ID
   * @param companyId - HubSpot company ID
   * @returns Company data with name and domain
   */
  async getCompanyById(
    companyId: string,
  ): Promise<{ name: string; domain: string | null }> {
    this.logger.log(`Fetching company from HubSpot: ${companyId}`);

    try {
      const company = await this.hubspotClient.crm.companies.basicApi.getById(
        companyId,
        ['name', 'domain'],
      );

      return {
        name: company.properties.name || 'Unnamed Company',
        domain: company.properties.domain || null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch company ${companyId}: ${errorMessage}`,
      );
      throw new HttpException(
        `Failed to fetch company ${companyId}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get deals associated with a contact
   * @param contactId - HubSpot contact ID
   * @returns Array of deal HubSpot IDs
   */
  async getContactDeals(contactId: string): Promise<string[]> {
    this.logger.log(`Fetching deals for contact: ${contactId}`);

    try {
      const response = await this.hubspotClient.crm.associations.batchApi.read(
        'contacts',
        'deals',
        { inputs: [{ id: contactId }] },
      );

      const dealIds = response.results.flatMap((result) =>
        result.to.map((assoc) => assoc.id),
      );
      this.logger.log(`Found ${dealIds.length} deals for contact ${contactId}`);

      return dealIds;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to fetch deals for contact ${contactId}: ${errorMessage}`,
      );
      return []; // Return empty array if associations fail
    }
  }

  /**
   * Get deal details by HubSpot ID
   * @param dealId - HubSpot deal ID
   * @returns Deal data with name, stage, and amount
   */
  async getDealById(
    dealId: string,
  ): Promise<{ name: string; stage: string | null; amount: number | null }> {
    this.logger.log(`Fetching deal from HubSpot: ${dealId}`);

    try {
      const deal = await this.hubspotClient.crm.deals.basicApi.getById(dealId, [
        'dealname',
        'dealstage',
        'amount',
      ]);

      return {
        name: deal.properties.dealname || 'Unnamed Deal',
        stage: deal.properties.dealstage || null,
        amount: deal.properties.amount
          ? parseFloat(deal.properties.amount)
          : null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch deal ${dealId}: ${errorMessage}`);
      throw new HttpException(
        `Failed to fetch deal ${dealId}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get line items associated with a deal
   * @param dealId - HubSpot deal ID
   * @returns Array of line item HubSpot IDs
   */
  async getDealLineItems(dealId: string): Promise<string[]> {
    this.logger.log(`Fetching line items for deal: ${dealId}`);

    try {
      const response = await this.hubspotClient.crm.associations.batchApi.read(
        'deals',
        'line_items',
        { inputs: [{ id: dealId }] },
      );

      const lineItemIds = response.results.flatMap((result) =>
        result.to.map((assoc) => assoc.id),
      );
      this.logger.log(
        `Found ${lineItemIds.length} line items for deal ${dealId}`,
      );

      return lineItemIds;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to fetch line items for deal ${dealId}: ${errorMessage}`,
      );
      return []; // Return empty array if associations fail
    }
  }

  /**
   * Get line item details by HubSpot ID
   * @param lineItemId - HubSpot line item ID
   * @returns Line item data with name, quantity, price, and product_id
   */
  async getLineItemById(lineItemId: string): Promise<{
    name: string;
    quantity: number;
    price: number | null;
    productId: string | null;
  }> {
    this.logger.log(`Fetching line item from HubSpot: ${lineItemId}`);

    try {
      const lineItem = await this.hubspotClient.crm.lineItems.basicApi.getById(
        lineItemId,
        ['name', 'quantity', 'price', 'hs_product_id'],
      );

      return {
        name: lineItem.properties.name || 'Unnamed Line Item',
        quantity: lineItem.properties.quantity
          ? parseInt(lineItem.properties.quantity, 10)
          : 1,
        price: lineItem.properties.price
          ? parseFloat(lineItem.properties.price)
          : null,
        productId: lineItem.properties.hs_product_id || null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch line item ${lineItemId}: ${errorMessage}`,
      );
      throw new HttpException(
        `Failed to fetch line item ${lineItemId}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
