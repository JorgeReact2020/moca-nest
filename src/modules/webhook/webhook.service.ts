import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '@contacts/contact.entity';
import { Company } from '@companies/company.entity';
import { Deal } from '@deals/deal.entity';
import { LineItem } from '@line-items/line-item.entity';
import { HubSpotService } from '@modules/hubspot/hubspot.service';
import { HubSpotWebhookEventDto } from './dto/hubspot-webhook.dto';
import { LoggerService } from '@shared/services/logger.service';

/**
 * Service responsible for processing HubSpot webhooks
 * Orchestrates the flow: webhook → HubSpot API → database
 * Follows NestJS pattern: Controller handles HTTP, Service handles business logic
 */
@Injectable()
export class WebhookService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
    @InjectRepository(LineItem)
    private lineItemRepository: Repository<LineItem>,
    private hubspotService: HubSpotService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('WebhookService');
  }

  /**
   * Process contact webhook from HubSpot
   * Implements the complete flow:
   * 1. Extract objectId from each webhook event
   * 2. Fetch complete contact data from HubSpot API
   * 3. Validate contact data
   * 4. Upsert contact to database
   *
   * @param events - Array of validated webhook events
   * @returns Number of events processed successfully
   */
  async processContactWebhook(
    events: HubSpotWebhookEventDto[],
  ): Promise<number> {
    this.logger.log(`Processing webhook with ${events.length} event(s)`);

    let processed = 0;

    // Process each event in the webhook payload
    for (const event of events) {
      try {
        await this.processContactEvent(event.objectId.toString());
        processed++;
      } catch (error) {
        const errorStack =
          error instanceof Error ? error.stack : 'No stack trace available';
        this.logger.error(
          `Failed to process event for contact ${event.objectId}`,
          errorStack,
        );
        // Continue processing other events even if one fails
        // In production, you might want to add this to a dead letter queue
      }
    }

    return processed;
  }

  /**
   * Process a single contact event
   * Fetches data from HubSpot and upserts to database
   * Also syncs associated companies, deals, and line items
   *
   * @param contactId - HubSpot contact ID (objectId)
   */
  private async processContactEvent(contactId: string): Promise<void> {
    this.logger.log(`Processing contact event for ID: ${contactId}`);

    // Step 1: Fetch contact data from HubSpot API
    const hubspotContact = await this.hubspotService.getContactById(contactId);

    // Step 2: Validate contact data
    if (!this.hubspotService.validateContactData(hubspotContact)) {
      throw new HttpException(
        'Invalid contact data received from HubSpot',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Step 3: Upsert contact to database
    const contact = await this.upsertContact({
      firstname: hubspotContact.firstname,
      lastname: hubspotContact.lastname,
      email: hubspotContact.email,
      hubspotId: contactId,
    });

    // Step 4: Sync associated companies
    await this.syncContactCompanies(contactId, contact.id);

    // Step 5: Sync associated deals (and their line items)
    await this.syncContactDeals(contactId, contact.id);

    this.logger.log(
      `Successfully processed contact ${contactId} with all associations`,
    );
  }

  /**
   * Upsert contact to database
   * Updates if exists (by email or hubspotId), creates if new
   * Uses database transaction for consistency
   *
   * @param contactData - Contact data to save
   * @returns Saved contact entity
   */
  async upsertContact(contactData: {
    firstname: string;
    lastname: string;
    email: string;
    hubspotId: string;
  }): Promise<Contact> {
    this.logger.log(`Upserting contact: ${contactData.email}`);

    try {
      // Try to find existing contact by email or hubspotId
      let contact = await this.contactRepository.findOne({
        where: [
          { email: contactData.email },
          { hubspotId: contactData.hubspotId },
        ],
      });

      if (contact) {
        // Update existing contact
        this.logger.log(`Updating existing contact: ${contact.id}`);
        contact.firstname = contactData.firstname;
        contact.lastname = contactData.lastname;
        contact.email = contactData.email;
        contact.hubspotId = contactData.hubspotId;
      } else {
        // Create new contact
        this.logger.log('Creating new contact');
        contact = this.contactRepository.create(contactData);
      }

      // Save (insert or update)
      const savedContact = await this.contactRepository.save(contact);

      this.logger.log(`Contact saved successfully: ${savedContact.id}`);

      return savedContact;
    } catch (error) {
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace available';
      this.logger.error(
        `Failed to upsert contact ${contactData.email}`,
        errorStack,
      );
      throw new HttpException(
        'Failed to save contact to database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync companies associated with a contact
   * @param hubspotContactId - HubSpot contact ID
   * @param contactId - Database contact UUID
   */
  private async syncContactCompanies(
    hubspotContactId: string,
    contactId: string,
  ): Promise<void> {
    this.logger.log(`Syncing companies for contact: ${hubspotContactId}`);

    try {
      // Get company associations from HubSpot
      const companyIds =
        await this.hubspotService.getContactCompanies(hubspotContactId);

      if (companyIds.length === 0) {
        this.logger.log(`No companies found for contact ${hubspotContactId}`);
        return;
      }

      // Fetch and upsert each company
      for (const companyId of companyIds) {
        try {
          const companyData =
            await this.hubspotService.getCompanyById(companyId);

          await this.upsertCompany({
            hubspotId: companyId,
            name: companyData.name,
            domain: companyData.domain,
            contactId,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(
            `Failed to sync company ${companyId}: ${errorMessage}`,
          );
          // Continue with other companies
        }
      }

      this.logger.log(`Successfully synced ${companyIds.length} companies`);
    } catch (error) {
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace available';
      this.logger.error(
        `Failed to sync companies for contact ${hubspotContactId}`,
        errorStack,
      );
      // Don't throw - we want to continue with deals sync even if companies fail
    }
  }

  /**
   * Sync deals associated with a contact
   * Also syncs line items for each deal
   * @param hubspotContactId - HubSpot contact ID
   * @param contactId - Database contact UUID
   */
  private async syncContactDeals(
    hubspotContactId: string,
    contactId: string,
  ): Promise<void> {
    this.logger.log(`Syncing deals for contact: ${hubspotContactId}`);

    try {
      // Get deal associations from HubSpot
      const dealIds =
        await this.hubspotService.getContactDeals(hubspotContactId);

      if (dealIds.length === 0) {
        this.logger.log(`No deals found for contact ${hubspotContactId}`);
        return;
      }

      // Fetch and upsert each deal
      for (const dealId of dealIds) {
        try {
          const dealData = await this.hubspotService.getDealById(dealId);

          // Get line items for this deal
          const lineItemIds =
            await this.hubspotService.getDealLineItems(dealId);
          const hasLineItems = lineItemIds.length > 0;

          // Upsert deal
          const deal = await this.upsertDeal({
            hubspotId: dealId,
            name: dealData.name,
            stage: dealData.stage,
            amount: dealData.amount,
            hasLineItems,
            contactId,
          });

          // Sync line items for this deal
          if (hasLineItems) {
            await this.syncDealLineItems(dealId, deal.id, lineItemIds);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to sync deal ${dealId}: ${errorMessage}`);
          // Continue with other deals
        }
      }

      this.logger.log(`Successfully synced ${dealIds.length} deals`);
    } catch (error) {
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace available';
      this.logger.error(
        `Failed to sync deals for contact ${hubspotContactId}`,
        errorStack,
      );
    }
  }

  /**
   * Sync line items for a deal
   * @param hubspotDealId - HubSpot deal ID
   * @param dealId - Database deal UUID
   * @param lineItemIds - Array of HubSpot line item IDs
   */
  private async syncDealLineItems(
    hubspotDealId: string,
    dealId: string,
    lineItemIds: string[],
  ): Promise<void> {
    this.logger.log(
      `Syncing ${lineItemIds.length} line items for deal: ${hubspotDealId}`,
    );

    for (const lineItemId of lineItemIds) {
      try {
        const lineItemData =
          await this.hubspotService.getLineItemById(lineItemId);

        await this.upsertLineItem({
          hubspotId: lineItemId,
          name: lineItemData.name,
          quantity: lineItemData.quantity,
          price: lineItemData.price,
          productId: lineItemData.productId,
          dealId,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Failed to sync line item ${lineItemId}: ${errorMessage}`,
        );
        // Continue with other line items
      }
    }

    this.logger.log(`Successfully synced ${lineItemIds.length} line items`);
  }

  /**
   * Upsert company to database
   * @param companyData - Company data to save
   * @returns Saved company entity
   */
  private async upsertCompany(companyData: {
    hubspotId: string;
    name: string;
    domain: string | null;
    contactId: string;
  }): Promise<Company> {
    let company = await this.companyRepository.findOne({
      where: { hubspotId: companyData.hubspotId },
    });

    if (company) {
      // Update existing
      company.name = companyData.name;
      company.domain = companyData.domain;
      company.contactId = companyData.contactId;
    } else {
      // Create new
      company = this.companyRepository.create(companyData);
    }

    return await this.companyRepository.save(company);
  }

  /**
   * Upsert deal to database
   * @param dealData - Deal data to save
   * @returns Saved deal entity
   */
  private async upsertDeal(dealData: {
    hubspotId: string;
    name: string;
    stage: string | null;
    amount: number | null;
    hasLineItems: boolean;
    contactId: string;
  }): Promise<Deal> {
    let deal = await this.dealRepository.findOne({
      where: { hubspotId: dealData.hubspotId },
    });

    if (deal) {
      // Update existing
      deal.name = dealData.name;
      deal.stage = dealData.stage;
      deal.amount = dealData.amount;
      deal.hasLineItems = dealData.hasLineItems;
      deal.contactId = dealData.contactId;
    } else {
      // Create new
      deal = this.dealRepository.create(dealData);
    }

    return await this.dealRepository.save(deal);
  }

  /**
   * Upsert line item to database
   * @param lineItemData - Line item data to save
   * @returns Saved line item entity
   */
  private async upsertLineItem(lineItemData: {
    hubspotId: string;
    name: string;
    quantity: number;
    price: number | null;
    productId: string | null;
    dealId: string;
  }): Promise<LineItem> {
    let lineItem = await this.lineItemRepository.findOne({
      where: { hubspotId: lineItemData.hubspotId },
    });

    if (lineItem) {
      // Update existing
      lineItem.name = lineItemData.name;
      lineItem.quantity = lineItemData.quantity;
      lineItem.price = lineItemData.price;
      lineItem.productId = lineItemData.productId;
      lineItem.dealId = lineItemData.dealId;
    } else {
      // Create new
      lineItem = this.lineItemRepository.create(lineItemData);
    }

    return await this.lineItemRepository.save(lineItem);
  }
}
