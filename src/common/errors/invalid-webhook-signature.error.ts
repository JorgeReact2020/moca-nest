import { UnauthorizedException } from '@nestjs/common';

export class InvalidWebhookSignatureError extends UnauthorizedException {
  constructor(public readonly receivedSignature: string) {
    super({
      message: 'Invalid webhook signature',
      receivedSignature,
      errorCode: 'INVALID_WEBHOOK_SIGNATURE',
    });
  }
}
