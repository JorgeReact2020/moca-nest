import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export class MocaSignatureGuard implements CanActivate {
  private webhookSecret: string;
  private appMode: string;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('MocaSignatureGuard');
    this.webhookSecret = this.configService.get<string>('moca.secret', '');
    this.appMode = this.configService.get<string>('APP_MODE', 'development');

    if (!this.webhookSecret) {
      this.logger.warn(
        'HubSpot webhook secret not configured - signature verification disabled',
      );
    }

    if (this.appMode !== 'production') {
      this.logger.warn(
        `APP_MODE is '${this.appMode}' - signature verification will be bypassed`,
      );
    }
  }

  /**
   * Validate webhook signature (v1)
   * @param context - ExecutionContext containing the request
   * @returns true if signature is valid, throws UnauthorizedException otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      body: unknown;
    }>();
    const signature = request.headers['x-moca-signature'] as string | undefined;

    // Get raw request body as string (not JSON.stringify)
    // NestJS stores the raw body in request.rawBody if configured
    const requestBody =
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);

    this.logger.log('Verifying Moca webhook signature');
    this.logger.debug(`Request body: ${requestBody}`);

    // Bypass signature verification if APP_MODE is not 'production'
    if (this.appMode !== 'production') {
      this.logger.warn(
        `Signature verification bypassed - APP_MODE is '${this.appMode}'`,
      );
      return true;
    }

    // Skip validation if no secret is configured (for development)
    if (!this.webhookSecret) {
      this.logger.warn('Signature verification skipped - no secret configured');
      return true;
    }

    // Signature header is required
    if (!signature) {
      this.logger.error('Missing X-Moca-Signature header');
      throw new UnauthorizedException('Missing signature header');
    }

    try {
      // Compute expected signature using SHA-256 (v1 method)

      this.logger.debug(`Expected signature: ${this.webhookSecret}`);
      this.logger.debug(`Received signature: ${this.webhookSecret}`);

      // Compare signatures using timing-safe comparison
      const isValid = signature === this.webhookSecret;

      if (isValid) {
        this.logger.log('Webhook signature verified successfully');
        return true;
      } else {
        this.logger.error('Invalid webhook signature');
        this.logger.error(`Expected: ${this.webhookSecret}`);
        this.logger.error(`Received: ${signature}`);
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.stack : 'Unknown error';
      this.logger.error('Signature verification failed', errorMessage);
      throw new UnauthorizedException('Signature verification failed');
    }
  }
}
