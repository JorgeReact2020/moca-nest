import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { LoggerService } from '../../shared/services/logger.service';

/**
 * Guard to verify HubSpot webhook signatures using SHA-256 (v1)
 * Reference: https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests
 *
 * For v1 signatures (webhooks):
 * - Concatenate: clientSecret + requestBody
 * - Hash with SHA-256 (NOT HMAC)
 * - Compare with X-HubSpot-Signature header
 */
@Injectable()
export class HubSpotSignatureGuard implements CanActivate {
  private webhookSecret: string;
  private appMode: string;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('HubSpotSignatureGuard');
    this.webhookSecret = this.configService.get<string>('hubspot.webhookSecret', '');
    this.appMode = this.configService.get<string>('APP_MODE', 'development');

    if (!this.webhookSecret) {
      this.logger.warn('HubSpot webhook secret not configured - signature verification disabled');
    }

    if (this.appMode !== 'production') {
      this.logger.warn(`APP_MODE is '${this.appMode}' - signature verification will be bypassed`);
    }
  }

  /**
   * Validate webhook signature (v1)
   * @param context - ExecutionContext containing the request
   * @returns true if signature is valid, throws UnauthorizedException otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-hubspot-signature'];

    // Get raw request body as string (not JSON.stringify)
    // NestJS stores the raw body in request.rawBody if configured
    const requestBody = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

    this.logger.log('Verifying HubSpot webhook signature');
    this.logger.debug(`Request body: ${requestBody}`);

    // Bypass signature verification if APP_MODE is not 'production'
    if (this.appMode !== 'production') {
      this.logger.warn(`Signature verification bypassed - APP_MODE is '${this.appMode}'`);
      return true;
    }

    // Skip validation if no secret is configured (for development)
    if (!this.webhookSecret) {
      this.logger.warn('Signature verification skipped - no secret configured');
      return true;
    }

    // Signature header is required
    if (!signature) {
      this.logger.error('Missing X-HubSpot-Signature header');
      throw new UnauthorizedException('Missing signature header');
    }

    try {
      // Compute expected signature using SHA-256 (v1 method)
      const expectedSignature = this.computeSignature(requestBody);

      this.logger.debug(`Expected signature: ${expectedSignature}`);
      this.logger.debug(`Received signature: ${signature}`);

      // Compare signatures using timing-safe comparison
      const isValid = this.secureCompare(signature, expectedSignature);

      if (isValid) {
        this.logger.log('Webhook signature verified successfully');
        return true;
      } else {
        this.logger.error('Invalid webhook signature');
        this.logger.error(`Expected: ${expectedSignature}`);
        this.logger.error(`Received: ${signature}`);
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (error) {
      this.logger.error('Signature verification failed', error.stack);
      throw new UnauthorizedException('Signature verification failed');
    }
  }

  /**
   * Compute SHA-256 signature for HubSpot v1 webhooks
   * Formula: SHA256(clientSecret + requestBody)
   *
   * @param payload - Request body as string
   * @returns Computed signature as hex string
   */
  private computeSignature(payload: string): string {
    // Concatenate client secret + request body
    const sourceString = this.webhookSecret + payload;

    this.logger.debug(`Source string for signature: ${sourceString.substring(0, 100)}...`);

    // Create SHA-256 hash (NOT HMAC!)
    return createHash('sha256')
      .update(sourceString)
      .digest('hex');
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   * @param a - First string
   * @param b - Second string
   * @returns true if strings are equal
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
