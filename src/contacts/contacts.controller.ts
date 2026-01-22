import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { Contact } from './contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@ApiExcludeController()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(): Promise<Contact[]> {
    return this.contactsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Contact | null> {
    return this.contactsService.findOne(id);
  }

  /**
   * GET /contacts/:id/companies
   * Get all companies for a specific contact
   */
  @Get(':id/companies')
  findCompanies(@Param('id') id: string) {
    return this.contactsService.findCompanies(id);
  }

  /**
   * GET /contacts/:id/deals
   * Get all deals for a specific contact (includes line items)
   */
  @Get(':id/deals')
  findDeals(@Param('id') id: string) {
    return this.contactsService.findDeals(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() createContactDto: CreateContactDto): Promise<Contact> {
    return this.contactsService.create(createContactDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ): Promise<Contact | null> {
    return this.contactsService.update(id, updateContactDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    return this.contactsService.remove(id);
  }
}
