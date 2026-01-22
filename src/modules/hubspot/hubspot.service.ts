import hubspotConfig from '@/config/hubspot.config';
import { Client } from '@hubspot/api-client';
import {
  FilterOperatorEnum,
  PublicObjectSearchRequest,
} from '@hubspot/api-client/lib/codegen/crm/companies';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { LoggerService } from '../../shared/services/logger.service';
import { MocaContactPropertiesDto } from '../moca/dto/moca-contact-properties.dto';
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

        // Handle not found (404)
        if (lastError.message.includes('404')) {
          this.logger.error(`Contact not found in HubSpot: ${contactId}`);
          throw new HttpException(
            `Contact ${contactId} not found in HubSpot`,
            HttpStatus.NOT_FOUND,
          );
        }

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

  /**
   * Get contacts associated with a deal
   * @param dealId - HubSpot deal ID
   * @returns Array of contact HubSpot IDs
   */
  async getDealContacts(dealId: string): Promise<string[]> {
    this.logger.log(`Fetching contacts for deal: ${dealId}`);

    try {
      const response = await this.hubspotClient.crm.associations.batchApi.read(
        'deals',
        'contacts',
        { inputs: [{ id: dealId }] },
      );

      const contactIds = response.results.flatMap((result) =>
        result.to.map((assoc) => assoc.id),
      );
      this.logger.log(`Found ${contactIds.length} contacts for deal ${dealId}`);

      return contactIds;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to fetch contacts for deal ${dealId}: ${errorMessage}`,
      );
      return []; // Return empty array if associations fail
    }
  }

  /**
   * Get companies associated with a deal
   * @param dealId - HubSpot deal ID
   * @returns Array of company HubSpot IDs
   */
  async getDealCompanies(dealId: string): Promise<string[]> {
    this.logger.log(`Fetching companies for deal: ${dealId}`);

    try {
      const response = await this.hubspotClient.crm.associations.batchApi.read(
        'deals',
        'companies',
        { inputs: [{ id: dealId }] },
      );

      const companyIds = response.results.flatMap((result) =>
        result.to.map((assoc) => assoc.id),
      );
      this.logger.log(
        `Found ${companyIds.length} companies for deal ${dealId}`,
      );

      return companyIds;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to fetch companies for deal ${dealId}: ${errorMessage}`,
      );
      return []; // Return empty array if associations fail
    }
  }

  /**
   * Create a new contact in HubSpot
   * @param properties - Contact properties (e.g., firstname, lastname, email)
   * @returns Created contact ID
   */
  async createContact(properties: MocaContactPropertiesDto): Promise<string> {
    this.logger.log('Creating new contact in HubSpot');
    this.logger.debug(`Contact properties: ${JSON.stringify(properties)}`);

    this.validateContactData({
      firstname: properties.firstname || '',
      lastname: properties.lastname || '',
      email: properties.email,
    });

    try {
      const response = await this.hubspotClient.crm.contacts.basicApi.create({
        properties: { ...properties },
      });

      this.logger.log(`Successfully created contact with ID: ${response.id}`);
      return response.id;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create contact: ${errorMessage}`);
      throw new HttpException(
        `Failed to create contact in HubSpot. Make sure all properties are valid. ${errorMessage}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Update an existing contact in HubSpot
   * @param contactId - HubSpot contact ID
   * @param properties - Contact properties to update
   * @returns Updated contact ID
   */
  async updateContact(
    contactId: string,
    properties: MocaContactPropertiesDto,
  ): Promise<string> {
    this.logger.log(`Updating contact in HubSpot: ${contactId}`);
    this.logger.debug(`Update properties: ${JSON.stringify(properties)}`);

    try {
      const response = await this.hubspotClient.crm.contacts.basicApi.update(
        contactId,
        { properties: { ...properties } },
      );

      this.logger.log(`Successfully updated contact: ${contactId}`);
      return response.id;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update contact ${contactId}: ${errorMessage}`,
      );

      const errorResponse = error as { response?: { status?: number } };
      if (errorResponse.response?.status === 404) {
        throw new HttpException(
          `Contact ${contactId} not found in HubSpot`,
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        `Failed to update contact ${contactId}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Search for a contact by email address
   * @param email - Email address to search for
   * @returns Contact ID if found, null otherwise
   */
  async searchContactByEmail(email: string): Promise<string | null> {
    this.logger.log(`Searching for contact by email: ${email}`);

    const filter: PublicObjectSearchRequest = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: FilterOperatorEnum.Eq,
              value: email,
            },
          ],
        },
      ],
      properties: ['email'],
      limit: 1,
    };

    try {
      const response =
        await this.hubspotClient.crm.contacts.searchApi.doSearch(filter);

      if (response.results.length > 0) {
        const contactId = response.results[0].id;
        this.logger.log(`Found contact with email ${email}: ${contactId}`);
        return contactId;
      }

      this.logger.log(`No contact found with email: ${email}`);
      return null;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to search contact by email ${email}: ${errorMessage}`,
      );
      throw new HttpException(
        'Failed to search contact by email',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Delete a contact from HubSpot
   * @param contactId - HubSpot contact ID to delete
   * @returns true if successfully deleted
   */
  async deleteContact(contactId: string): Promise<boolean> {
    this.logger.log(`Deleting contact from HubSpot: ${contactId}`);

    try {
      await this.hubspotClient.crm.contacts.basicApi.archive(contactId);

      this.logger.log(`Successfully deleted contact: ${contactId}`);
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to delete contact ${contactId}: ${errorMessage}`,
      );

      const errorResponse = error as { response?: { status?: number } };
      if (errorResponse.response?.status === 404) {
        throw new HttpException(
          `Contact ${contactId} not found in HubSpot`,
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        `Failed to delete contact ${contactId}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Check if HubSpot API is accessible and running
   * @returns true if HubSpot is accessible, false otherwise
   */
  async checkHubSpotStatus(): Promise<boolean> {
    this.logger.log('Checking HubSpot API status');

    try {
      const response = await fetch(
        'https://api.hubapi.com/account-info/v3/details',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.hubSpotKeys.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        this.logger.warn(`HubSpot API returned status: ${response.status}`);
        return false;
      }
      await response.json();
      this.logger.log('HubSpot API is accessible');
      return true;
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`HubSpot API is not accessible: ${errorMessage}`);
      return false;
    }
  }
}
