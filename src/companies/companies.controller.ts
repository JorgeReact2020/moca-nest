import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiExcludeController()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * GET /companies
   * Get all companies with their associated contacts
   */
  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  /**
   * GET /companies/:id
   * Get a single company by ID with its contact
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  /**
   * POST /companies
   * Create a new company
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  /**
   * PATCH /companies/:id
   * Update a company
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  /**
   * DELETE /companies/:id
   * Delete a company
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.companiesService.remove(id);
  }
}
