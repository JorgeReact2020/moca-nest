import { Injectable } from '@nestjs/common';
import { json } from 'stream/consumers';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      statusCode: 200,
      message: 'Hello World2!',
      data: {
        timestamp: new Date().toISOString(),
      }
    };
  }
}
