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

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      //body: unknown;
      //headers: Record<string, string>;
    }>();
    const { method, url /*body,*/ /*headers*/ } = request;
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`Incoming ${method} ${url}`, 'HTTP');
    //this.logger.debug(`Request body: ${JSON.stringify(body)}`, 'HTTP');
    //this.logger.debug(`Request headers: ${JSON.stringify(headers)}`, 'HTTP');

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<{
            statusCode: number;
          }>();
          const { statusCode } = response;
          const responseTime = Date.now() - startTime;

          this.logger.logHttp(method, url, statusCode, responseTime, 'HTTP');
        },
        error: (error: Error) => {
          const responseTime = Date.now() - startTime;
          const errorStack = error.stack ?? 'No stack trace available';
          this.logger.error(
            `${method} ${url} failed after ${responseTime}ms`,
            errorStack,
            'HTTP',
          );
        },
      }),
    );
  }
}
