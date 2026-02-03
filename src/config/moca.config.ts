import { registerAs } from '@nestjs/config';

export default registerAs('moca', () => ({
  secret: process.env.MOCA_API_KEY || '',
  apiKey: process.env.MOCA_API_SECRET || '',
}));
