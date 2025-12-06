import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
  ) {}

  findAll(): Promise<Contact[]> {
    return this.contactsRepository.find();
  }

  findOne(id: string): Promise<Contact | null> {
    return this.contactsRepository.findOneBy({ id });
  }

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    const newContact = this.contactsRepository.create(createContactDto);
    return this.contactsRepository.save(newContact);
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
