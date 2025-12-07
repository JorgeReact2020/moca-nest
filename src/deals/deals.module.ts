import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { Deal } from './deal.entity';
import { LineItem } from '@line-items/line-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Deal, LineItem])],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
