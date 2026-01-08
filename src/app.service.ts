import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(req: Request): object {
    return {
      statusCode: 200,
      path: req.method,
      message: 'Hello World5',
      data: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
