import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './contact.entity';
import { Company } from '@companies/company.entity';
import { Deal } from '@deals/deal.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
  ) {}

  findAll(): Promise<Contact[]> {
    return this.contactsRepository.find();
  }

  findOne(id: string): Promise<Contact | null> {
    return this.contactsRepository.findOneBy({ id });
  }

  /**
   * Get all companies for a specific contact
   */
  async findCompanies(contactId: string): Promise<Company[]> {
    return await this.companyRepository.find({
      where: { contactId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all deals for a specific contact
   */
  async findDeals(contactId: string): Promise<Deal[]> {
    return await this.dealRepository.find({
      where: { contactId },
      relations: ['lineItems'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    try {
      const newContact = this.contactsRepository.create(createContactDto);
      return await this.contactsRepository.save(newContact);
    } catch (error) {
      // PostgreSQL unique violation error code
      if (error.code === '23505') {
        throw new ConflictException(
          `Contact with email '${createContactDto.email}' already exists`,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateContactDto: UpdateContactDto,
  ): Promise<Contact | null> {
    await this.contactsRepository.update(id, updateContactDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.contactsRepository.delete(id);
  }
}
