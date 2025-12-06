import { registerAs } from '@nestjs/config';

export default registerAs('logger', () => ({
  level: process.env.LOG_LEVEL || 'info',
  directory: process.env.LOG_DIRECTORY || 'logs',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  maxSize: '20m',
  format: process.env.LOG_FORMAT || 'json',
}));
