import { registerAs } from '@nestjs/config';

export default registerAs('moca', () => ({
  apiUrl: process.env.MOCA_API_URL || 'https://moca-api.com',
  apiKey: process.env.MOCA_API_KEY || '',
  retryAttempts: parseInt(process.env.MOCA_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.MOCA_RETRY_DELAY || '1000', 10),
}));
