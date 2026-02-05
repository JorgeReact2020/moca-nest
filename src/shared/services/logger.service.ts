import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Custom logger service using Winston with daily file rotation
 * Follows Laravel-style logging pattern with correlation ID support
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;
  private correlationId?: string;

  constructor(private configService: ConfigService) {
    this.initializeLogger();
  }

  /**
   * Set correlation ID for subsequent log messages
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
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
      winston.format.printf((info) => {
        const timestamp = info.timestamp as string | undefined;
        const level = info.level as string | undefined;
        const message = info.message as string | undefined;
        const context = info.context as
          | string
          | Record<string, unknown>
          | undefined;
        const stack = info.stack as
          | string
          | Record<string, unknown>
          | undefined;
        const correlationId = info.correlationId as string | undefined;

        const correlationStr = correlationId ? `[${correlationId}] ` : '';
        const contextStr = context
          ? ` {${typeof context === 'string' ? context : JSON.stringify(context)}}`
          : '';

        const metaStr =
          Object.keys(info).filter(
            (key) =>
              ![
                'timestamp',
                'level',
                'message',
                'context',
                'stack',
                'correlationId',
              ].includes(key),
          ).length > 0
            ? ` ${JSON.stringify(
                Object.fromEntries(
                  Object.entries(info).filter(
                    ([key]) =>
                      ![
                        'timestamp',
                        'level',
                        'message',
                        'context',
                        'stack',
                        'correlationId',
                      ].includes(key),
                  ),
                ),
              )}`
            : '';

        const stackStr = stack
          ? `\n${typeof stack === 'string' ? stack : JSON.stringify(stack)}`
          : '';

        return `[${String(timestamp)}] ${correlationStr}[${String(level).toUpperCase()}] ${String(message)}${contextStr}${metaStr}${stackStr}`;
      }),
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
    this.logger.info(message, {
      context: context || this.context,
      correlationId: this.correlationId,
    });
  }

  /**
   * Log error level message
   */
  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, {
      context: context || this.context,
      stack: trace,
      correlationId: this.correlationId,
    });
  }

  /**
   * Log warning level message
   */
  warn(message: string, context?: string): void {
    this.logger.warn(message, {
      context: context || this.context,
      correlationId: this.correlationId,
    });
  }

  /**
   * Log debug level message
   */
  debug(message: string, context?: string): void {
    this.logger.debug(message, {
      context: context || this.context,
      correlationId: this.correlationId,
    });
  }

  /**
   * Log verbose level message
   */
  verbose(message: string, context?: string): void {
    this.logger.verbose(message, {
      context: context || this.context,
      correlationId: this.correlationId,
    });
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
      correlationId: this.correlationId,
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
      correlationId: this.correlationId,
    });
  }
}
