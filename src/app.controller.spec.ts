import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return JSON response with status 200', () => {
      const result = appController.getHello() as {
        statusCode: number;
        message: string;
        data: { timestamp: string };
      };
      expect(result).toHaveProperty('statusCode', 200);
      expect(result).toHaveProperty('message', 'Hello World2!');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('timestamp');
    });
  });
});
