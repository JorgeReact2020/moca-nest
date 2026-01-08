import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      statusCode: 200,
      message: 'Hello World5',
      data: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
