import { Controller, Get, HttpCode, Request } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @HttpCode(200)
  getHello(@Request() req: Request): object {
    return this.appService.getHello(req);
  }
}
