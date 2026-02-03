import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../shared/services/logger.service';

/**
 * Guard to verify Supabase webhook signatures using HMAC SHA-256
 * Reference: https://supabase.com/docs/guides/database/webhooks#payload
 *
 * For Supabase webhooks:
 * - Uses x-supabase-signature header
 * - HMAC SHA-256 verification
 * - Temporarily bypassed in non-production until secret is configured
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
        'Supabase webhook secret not configured - signature verification disabled',
      );
    }

    if (this.appMode !== 'production') {
      this.logger.warn(
        `APP_MODE is '${this.appMode}' - signature verification will be bypassed`,
      );
    }
  }

  /**
   * Validate webhook signature (Supabase)
   * @param context - ExecutionContext containing the request
   * @returns true if signature is valid, throws UnauthorizedException otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      body: unknown;
    }>();
    const signature = request.headers['x-supabase-signature'] as
      | string
      | undefined;

    // Get raw request body as string
    const requestBody =
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);

    this.logger.log(
      '==============Verifying Supabase webhook signature==============',
    );
    this.logger.debug(`Request body: ${requestBody}`);

    // Bypass signature verification if APP_MODE is not 'production' or secret not configured
    if (this.appMode !== 'production') {
      this.logger.warn(
        `Signature verification bypassed - APP_MODE is '${this.appMode}', secret configured: ${!!this.webhookSecret}`,
      );
      return true;
    }

    // Signature header is required
    if (!signature) {
      this.logger.error('Missing x-supabase-signature header');
      throw new UnauthorizedException('Missing credentials');
    }

    try {
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
