import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { Contact } from './contact.entity';
import { Company } from '@companies/company.entity';
import { Deal } from '@deals/deal.entity';
import { LineItem } from '@line-items/line-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Company, Deal, LineItem])],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [TypeOrmModule], // Export so other modules can use these repositories
})
export class ContactsModule {}
