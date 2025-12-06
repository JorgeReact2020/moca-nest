import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../../shared/services/logger.service';

/**
 * Interceptor to log all incoming HTTP requests and responses
 * Logs method, URL, status code, and response time
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`Incoming ${method} ${url}`, 'HTTP');
    this.logger.debug(`Request body: ${JSON.stringify(body)}`, 'HTTP');
    this.logger.debug(`Request headers: ${JSON.stringify(headers)}`, 'HTTP');

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const responseTime = Date.now() - startTime;

          this.logger.logHttp(method, url, statusCode, responseTime, 'HTTP');
          this.logger.debug(`Response data: ${JSON.stringify(data)}`, 'HTTP');
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} failed after ${responseTime}ms`,
            error.stack,
            'HTTP',
          );
        },
      }),
    );
  }
}
