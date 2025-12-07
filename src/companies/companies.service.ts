import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  /**
   * Get all companies with their associated contacts
   */
  async findAll(): Promise<Company[]> {
    return await this.companyRepository.find({
      relations: ['contact'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single company by ID
   */
  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['contact'],
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  /**
   * Get all companies for a specific contact
   */
  async findByContact(contactId: string): Promise<Company[]> {
    return await this.companyRepository.find({
      where: { contactId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a new company
   */
  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepository.create(createCompanyDto);
    return await this.companyRepository.save(company);
  }

  /**
   * Update a company
   */
  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, updateCompanyDto);
    return await this.companyRepository.save(company);
  }

  /**
   * Delete a company
   */
  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companyRepository.remove(company);
  }
}
