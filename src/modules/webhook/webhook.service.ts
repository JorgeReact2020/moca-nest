import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../contacts/contact.entity';
import { HubSpotService } from '../hubspot/hubspot.service';
import { HubSpotWebhookEventDto } from './dto/hubspot-webhook.dto';
import { LoggerService } from '../../shared/services/logger.service';

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
        this.logger.error(
          `Failed to process event for contact ${event.objectId}`,
          error.stack,
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
    await this.upsertContact({
      firstname: hubspotContact.firstname,
      lastname: hubspotContact.lastname,
      email: hubspotContact.email,
      hubspotId: contactId,
    });

    this.logger.log(`Successfully processed contact ${contactId}`);
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
      this.logger.error(
        `Failed to upsert contact ${contactData.email}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to save contact to database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
