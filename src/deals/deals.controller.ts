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
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  /**
   * GET /deals
   * Get all deals with their associated contacts and line items
   */
  @Get()
  findAll() {
    return this.dealsService.findAll();
  }

  /**
   * GET /deals/:id
   * Get a single deal by ID with its contact and line items
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  /**
   * GET /deals/:id/line-items
   * Get all line items for a specific deal
   */
  @Get(':id/line-items')
  findLineItems(@Param('id') id: string) {
    return this.dealsService.findLineItems(id);
  }

  /**
   * POST /deals
   * Create a new deal
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDealDto: CreateDealDto) {
    return this.dealsService.create(createDealDto);
  }

  /**
   * PATCH /deals/:id
   * Update a deal
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto) {
    return this.dealsService.update(id, updateDealDto);
  }

  /**
   * DELETE /deals/:id
   * Delete a deal
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.dealsService.remove(id);
  }
}
