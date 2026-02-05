import { Injectable, NestMiddleware } from '@nestjs/common';
import * as crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Check if correlation ID exists in request header, otherwise generate new one
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) || crypto.randomUUID();

    // Attach to request for use in controllers/services
    req.headers[CORRELATION_ID_HEADER] = correlationId;

    // Return in response header for client tracking
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }
}
