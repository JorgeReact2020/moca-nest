import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LineItemsService } from './line-items.service';
import { LineItemsController } from './line-items.controller';
import { LineItem } from './line-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LineItem])],
  controllers: [LineItemsController],
  providers: [LineItemsService],
  exports: [LineItemsService],
})
export class LineItemsModule {}
