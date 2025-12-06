import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';

/**
 * Custom logger service using Winston with daily file rotation
 * Follows Laravel-style logging pattern
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private configService: ConfigService) {
    this.initializeLogger();
  }

  /**
   * Initialize Winston logger with daily rotation transport
   */
  private initializeLogger(): void {
    const logDirectory = this.configService.get<string>(
      'logger.directory',
      'logs',
    );
    const logLevel = this.configService.get<string>('logger.level', 'info');
    const datePattern = this.configService.get<string>(
      'logger.datePattern',
      'YYYY-MM-DD',
    );
    const maxFiles = this.configService.get<string>('logger.maxFiles', '30d');
    const maxSize = this.configService.get<string>('logger.maxSize', '20m');

    // Custom format similar to Laravel: [YYYY-MM-DD HH:mm:ss] [LEVEL] Message {context}
    const customFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(
        ({ timestamp, level, message, context, stack, ...meta }) => {
          const contextStr = context ? ` {${context}}` : '';
          const metaStr = Object.keys(meta).length
            ? ` ${JSON.stringify(meta)}`
            : '';
          const stackStr = stack ? `\n${stack}` : '';
          return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}${metaStr}${stackStr}`;
        },
      ),
    );

    // Transport for daily rotating files
    const fileTransport = new DailyRotateFile({
      dirname: logDirectory,
      filename: 'app-%DATE%.log',
      datePattern,
      maxFiles,
      maxSize,
      format: customFormat,
    });

    // Console transport for development
    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), customFormat),
    });

    this.logger = winston.createLogger({
      level: logLevel,
      transports: [
        fileTransport,
        ...(process.env.NODE_ENV !== 'production' ? [consoleTransport] : []),
      ],
    });
  }

  /**
   * Set context for subsequent log messages
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log info level message
   */
  log(message: string, context?: string): void {
    this.logger.info(message, { context: context || this.context });
  }

  /**
   * Log error level message
   */
  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, {
      context: context || this.context,
      stack: trace,
    });
  }

  /**
   * Log warning level message
   */
  warn(message: string, context?: string): void {
    this.logger.warn(message, { context: context || this.context });
  }

  /**
   * Log debug level message
   */
  debug(message: string, context?: string): void {
    this.logger.debug(message, { context: context || this.context });
  }

  /**
   * Log verbose level message
   */
  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context: context || this.context });
  }

  /**
   * Log with additional metadata
   */
  logWithMeta(
    level: string,
    message: string,
    meta: Record<string, any>,
    context?: string,
  ): void {
    this.logger.log(level, message, {
      ...meta,
      context: context || this.context,
    });
  }

  /**
   * Log HTTP request/response
   */
  logHttp(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    context?: string,
  ): void {
    this.logger.info(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
      context: context || this.context,
      method,
      url,
      statusCode,
      responseTime,
    });
  }
}
