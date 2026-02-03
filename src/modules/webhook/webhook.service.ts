import { Company } from '@companies/company.entity';
import { Contact } from '@contacts/contact.entity';
import { Deal } from '@deals/deal.entity';
import { LineItem } from '@line-items/line-item.entity';
import { HubSpotContactData, HubSpotService } from '@modules/hubspot/hubspot.service';
import { MocaService } from '@modules/moca/moca.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@shared/services/logger.service';
import { Repository } from 'typeorm';
import { HubSpotWebhookEventDto } from './dto/hubspot-webhook.dto';

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
    private mocaService: MocaService,
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
        await this.processContactEvent(event);
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
   * Process deal creation webhook from HubSpot
   * Retrieves the deal, associated contact, company, and line items
   *
   * @param events - Array of validated webhook events
   * @returns Number of events processed successfully
   */
  async processDealCreationWebhook(
    events: HubSpotWebhookEventDto[],
  ): Promise<number> {
    this.logger.log(
      `Processing deal creation webhook with ${events.length} event(s)`,
    );

    let processed = 0;

    for (const event of events) {
      try {
        await this.processDealEvent(event.objectId.toString());
        processed++;
      } catch (error) {
        const errorStack =
          error instanceof Error ? error.stack : 'No stack trace available';
        this.logger.error(
          `Failed to process event for deal ${event.objectId}`,
          errorStack,
        );
        // Continue processing other events even if one fails
      }
    }

    return processed;
  }

  /**
   * Process a single deal event
   * Fetches deal data and all associated entities from HubSpot
   *
   * @param dealId - HubSpot deal ID (objectId)
   */
  private async processDealEvent(dealId: string): Promise<void> {
    this.logger.log(`Processing deal event for ID: ${dealId}`);

    // Step 1: Fetch deal data from HubSpot
    const dealData = await this.hubspotService.getDealById(dealId);
    this.logger.log(
      `Fetched deal "${dealData.name}" (stage: ${dealData.stage}, amount: ${dealData.amount})`,
    );

    // Step 2: Get associated contacts (all deals must be attached to at least one contact)
    const contactIds = await this.hubspotService.getDealContacts(dealId);
    if (contactIds.length === 0) {
      this.logger.warn(
        `Deal ${dealId} has no associated contacts. Skipping processing.`,
      );
      return;
    }

    this.logger.log(`Found ${contactIds.length} contact(s) for deal ${dealId}`);

    // Step 3: Ensure primary contact exists in database
    const primaryContactId = contactIds[0]; // Use first contact as primary
    let contact = await this.contactRepository.findOne({
      where: { hubspotId: primaryContactId },
    });

    if (!contact) {
      // Contact doesn't exist in DB, fetch and create it
      this.logger.log(
        `Contact ${primaryContactId} not found in DB, fetching from HubSpot`,
      );
      const hubspotContact =
        await this.hubspotService.getContactById(primaryContactId);

      contact = await this.upsertContact({
        firstname: hubspotContact.firstname,
        lastname: hubspotContact.lastname,
        email: hubspotContact.email,
        hubspotId: primaryContactId,
      });
    }

    // Step 4: Get associated companies
    const companyIds = await this.hubspotService.getDealCompanies(dealId);
    this.logger.log(
      `Found ${companyIds.length} company(ies) for deal ${dealId}`,
    );

    // Sync companies if any exist
    if (companyIds.length > 0) {
      await this.syncDealCompanies(dealId, companyIds, contact.id);
    }

    // Step 5: Upsert the deal
    const deal = await this.upsertDeal({
      hubspotId: dealId,
      name: dealData.name,
      stage: dealData.stage,
      amount: dealData.amount,
      hasLineItems: false, // Will be updated after syncing line items
      contactId: contact.id,
    });

    // Step 6: Get and sync line items
    const lineItemIds = await this.hubspotService.getDealLineItems(dealId);
    this.logger.log(
      `Found ${lineItemIds.length} line item(s) for deal ${dealId}`,
    );

    if (lineItemIds.length > 0) {
      await this.syncDealLineItems(dealId, deal.id, lineItemIds);
      // Update deal to indicate it has line items
      await this.dealRepository.update(deal.id, { hasLineItems: true });
    }

    this.logger.log(
      `Successfully processed deal ${dealId} with all associations`,
    );
  }

  /**
   * Sync companies associated with a deal
   * @param dealId - HubSpot deal ID
   * @param companyIds - Array of company HubSpot IDs
   * @param contactId - Database contact UUID (for linking companies to contact)
   */
  private async syncDealCompanies(
    dealId: string,
    companyIds: string[],
    contactId: string,
  ): Promise<void> {
    this.logger.log(
      `Syncing ${companyIds.length} companies for deal ${dealId}`,
    );

    for (const companyId of companyIds) {
      try {
        const companyData = await this.hubspotService.getCompanyById(companyId);

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
          `Failed to sync company ${companyId} for deal ${dealId}: ${errorMessage}`,
        );
        // Continue with other companies
      }
    }

    this.logger.log(
      `Successfully synced ${companyIds.length} companies for deal ${dealId}`,
    );
  }

  /**
   * Process a single contact event
   * Fetches data from HubSpot and upserts to database
   * Also syncs associated companies, deals, and line items
   *
   * @param contactId - HubSpot contact ID (objectId)
   */
  private async processContactEvent(
    event: HubSpotWebhookEventDto,
  ): Promise<void> {
    this.logger.log(
      `Processing contact event for ID: ${event.objectId.toString()}`,
    );

    // Step 1: Fetch contact data from HubSpot API
    const hubspotContact = await this.hubspotService.getContactById(
      event.objectId.toString(),
    );

    this.logger.log(`hubspotContactTESTTES ${JSON.stringify(hubspotContact)}`);
    // Step 2: Validate contact data
    if (!this.hubspotService.validateContactData(hubspotContact)) {
      throw new HttpException(
        'Invalid contact data received from HubSpot',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!hubspotContact.ct_moca_id_database) {
      throw new HttpException(
        'Contact missing ct_moca_id_database property',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const isAPiMocaUp = this.mocaHealh();
    if (!isAPiMocaUp) {
      this.logger.log(
        `Moca API is down, skipping processing for contact ${event.objectId.toString()}`,
      );
      await this.upsertContact({
        firstname: hubspotContact.firstname,
        lastname: hubspotContact.lastname,
        email: hubspotContact.email,
        hubspotId: event.objectId.toString(),
      });
      return;
    }

    this.syncContactToMoca(hubspotContact);
    // Step 3: Upsert contact to database

    // Step 4: Sync associated companies
    //await this.syncContactCompanies(event.objectId.toString(), contact.id);
    // Step 5: Sync associated deals (and their line items)
    //await this.syncContactDeals(event.objectId.toString(), contact.id);
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

      // Sync to external Moca API
      await this.syncContactToMoca(savedContact);

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

  /**
   * Sync contact to external Moca API
   * Updates mocaUserId, syncedAt, and syncStatus after sync attempt
   *
   * @param contact - Contact to sync
   */
  private async syncContactToMoca(contact: HubSpotContactData): Promise<void> {
    try {
      this.logger.log(`Syncing contact ${contact.email} to Moca API`);

      // Call Moca API to sync contact
      const mocaUserId = await this.mocaService.syncContact(contact);

      // Update contact with mocaUserId, syncedAt timestamp, and success status
   /*    await this.contactRepository.update(contact.id, {
        mocaUserId,
        syncedAt: new Date(),
        syncStatus: true, // Success
      }); */

      this.logger.log(
        `Successfully synced contact ${contact.email} to Moca API (mocaUserId: ${mocaUserId})`,
      );
    } catch (error) {
      // Mark sync as failed and update syncedAt to track last attempt
/*       await this.contactRepository.update(contact.id, {
        syncedAt: new Date(),
        syncStatus: false, // Failed
      }); */

      // Log error but don't throw - we don't want Moca sync failures to block HubSpot webhook processing
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace available';
      this.logger.error(
        `Failed to sync contact ${contact.email} to Moca API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorStack,
      );
      // The contact was saved to local database successfully
      // Moca sync will be retried on next contact update from HubSpot
    }
  }

  private async mocaHealh(): Promise<boolean> {
    try {
      this.logger.log(`Checking if Moca API is up`);
      const isUpAPI = await Promise.resolve(true);
      if (isUpAPI) this.logger.log(`Successfully checked Moca API health`);
      return isUpAPI;
    } catch (error) {
      this.logger.log(`Moca API is not up`);
      return false;
    }
  }
}
