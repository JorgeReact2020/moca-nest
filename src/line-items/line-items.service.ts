import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LineItem } from './line-item.entity';
import { CreateLineItemDto } from './dto/create-line-item.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';

@Injectable()
export class LineItemsService {
  constructor(
    @InjectRepository(LineItem)
    private lineItemRepository: Repository<LineItem>,
  ) {}

  /**
   * Get all line items with their associated deals
   */
  async findAll(): Promise<LineItem[]> {
    return await this.lineItemRepository.find({
      relations: ['deal'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single line item by ID
   */
  async findOne(id: string): Promise<LineItem> {
    const lineItem = await this.lineItemRepository.findOne({
      where: { id },
      relations: ['deal'],
    });

    if (!lineItem) {
      throw new NotFoundException(`Line item with ID ${id} not found`);
    }

    return lineItem;
  }

  /**
   * Get all line items for a specific deal
   */
  async findByDeal(dealId: string): Promise<LineItem[]> {
    return await this.lineItemRepository.find({
      where: { dealId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a new line item
   */
  async create(createLineItemDto: CreateLineItemDto): Promise<LineItem> {
    const lineItem = this.lineItemRepository.create(createLineItemDto);
    return await this.lineItemRepository.save(lineItem);
  }

  /**
   * Update a line item
   */
  async update(
    id: string,
    updateLineItemDto: UpdateLineItemDto,
  ): Promise<LineItem> {
    const lineItem = await this.findOne(id);
    Object.assign(lineItem, updateLineItemDto);
    return await this.lineItemRepository.save(lineItem);
  }

  /**
   * Delete a line item
   */
  async remove(id: string): Promise<void> {
    const lineItem = await this.findOne(id);
    await this.lineItemRepository.remove(lineItem);
  }
}
