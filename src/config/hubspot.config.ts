import { registerAs } from '@nestjs/config';

export default registerAs('hubspot', () => ({
  apiKey: process.env.HUBSPOT_API_KEY,
  webhookSecret: process.env.HUBSPOT_WEBHOOK_SECRET,
  retryAttempts: parseInt(process.env.HUBSPOT_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.HUBSPOT_RETRY_DELAY || '1000', 10),
}));
