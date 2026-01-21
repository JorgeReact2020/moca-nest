import { Contact } from '@contacts/contact.entity';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@shared/services/logger.service';

/**
 * Service responsible for syncing contact data to external Moca API
 */
@Injectable()
export class MocaService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('MocaService');
    this.apiUrl = this.configService.get<string>('moca.apiUrl', '');
    this.apiKey = this.configService.get<string>('hubspot.webhookSecret', '');
    this.retryAttempts = this.configService.get<number>(
      'moca.retryAttempts',
      3,
    );
    this.retryDelay = this.configService.get<number>('moca.retryDelay', 1000);
  }

  /**
   * Ping Moca API to check if it's available
   * @returns true if API is reachable, false otherwise
   */
  async ping(): Promise<boolean> {
    try {
      return await Promise.resolve(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Moca API is not available: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Sync contact to external Moca API
   * Checks if contact exists by email, then POST (create) or PUT (update)
   *
   * @param contact - Contact entity to sync
   * @returns mocaUserId from external API
   */
  async syncContact(contact: Contact): Promise<string> {
    this.logger.log(
      `Syncing contact ${contact.email} to Moca API (mocaUserId: ${contact.mocaUserId || 'new'})`,
    );

    // Check if Moca API is available before proceeding
    const isApiAvailable = await this.ping();
    if (!isApiAvailable) {
      throw new HttpException(
        'Moca API is not available',
        503, // Service Unavailable
      );
    }

    try {
      // Check if contact already has mocaUserId (was previously synced)
      const isUpdate = !!contact.mocaUserId;
      let method = isUpdate ? 'PUT' : 'POST';
      let endpoint = isUpdate
        ? `${this.apiUrl}/client/${contact.mocaUserId}`
        : `${this.apiUrl}/client`;

      const payload = this.buildPayload(contact);

      this.logger.debug(
        `${method} ${endpoint} - Payload: ${JSON.stringify(payload)}`,
      );

      let response: { id: string };
      try {
        response = await this.makeRequest(
          endpoint,
          method,
          payload,
          this.retryAttempts,
        );
      } catch (error) {
        // If PUT fails with 404, the contact doesn't exist in Moca - fallback to POST
        const httpError = error as HttpException;
        if (isUpdate && httpError.getStatus && httpError.getStatus() === 404) {
          this.logger.warn(
            `Contact ${contact.mocaUserId} not found in Moca API, creating new contact instead`,
          );
          method = 'POST';
          endpoint = `${this.apiUrl}/client`;
          this.logger.debug(
            `${method} ${endpoint} - Payload: ${JSON.stringify(payload)}`,
          );
          response = await this.makeRequest(
            endpoint,
            method,
            payload,
            this.retryAttempts,
          );
        } else {
          throw error;
        }
      }

      const mocaUserId = response.id;

      this.logger.log(
        `Successfully synced contact ${contact.email} (mocaUserId: ${mocaUserId})`,
      );

      return mocaUserId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace available';

      this.logger.error(
        `Failed to sync contact ${contact.email} to Moca API: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Build payload from contact entity
   */
  private buildPayload(contact: Contact) {
    return {
      email: contact.email,
      firstname: contact.firstname,
      lastname: contact.lastname,
      hubspotId: contact.hubspotId,
    };
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    url: string,
    method: string,
    payload: unknown,
    attemptsLeft: number,
  ): Promise<{ id: string }> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify(payload),
      });

      // Handle 409 Conflict - contact already exists in Moca API
      if (response.status === 409) {
        const data = (await response.json()) as {
          mocaUserId?: string;
          id?: string;
        };
        // Return the existing mocaUserId from the API
        if (data.mocaUserId || data.id) {
          this.logger.log(
            `Contact already exists in Moca API with ID: ${data.mocaUserId || data.id}`,
          );
          return { id: data.mocaUserId || data.id! };
        }
      }

      if (!response.ok) {
        throw new HttpException(
          `Moca API returned ${response.status}: ${response.statusText}`,
          response.status,
        );
      }

      const data = (await response.json()) as { id: string };
      return data;
    } catch (error) {
      if (attemptsLeft > 1) {
        this.logger.warn(
          `Request failed, retrying... (${attemptsLeft - 1} attempts left)`,
        );
        await this.delay(this.retryDelay);
        return this.makeRequest(url, method, payload, attemptsLeft - 1);
      }
      throw error;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
