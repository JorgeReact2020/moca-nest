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
import { LineItemsService } from './line-items.service';
import { CreateLineItemDto } from './dto/create-line-item.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';

@Controller('line-items')
export class LineItemsController {
  constructor(private readonly lineItemsService: LineItemsService) {}

  /**
   * GET /line-items
   * Get all line items with their associated deals
   */
  @Get()
  findAll() {
    return this.lineItemsService.findAll();
  }

  /**
   * GET /line-items/:id
   * Get a single line item by ID with its deal
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lineItemsService.findOne(id);
  }

  /**
   * POST /line-items
   * Create a new line item
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createLineItemDto: CreateLineItemDto) {
    return this.lineItemsService.create(createLineItemDto);
  }

  /**
   * PATCH /line-items/:id
   * Update a line item
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLineItemDto: UpdateLineItemDto,
  ) {
    return this.lineItemsService.update(id, updateLineItemDto);
  }

  /**
   * DELETE /line-items/:id
   * Delete a line item
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.lineItemsService.remove(id);
  }
}
