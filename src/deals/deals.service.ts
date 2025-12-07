import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal } from './deal.entity';
import { LineItem } from '@line-items/line-item.entity';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
    @InjectRepository(LineItem)
    private lineItemRepository: Repository<LineItem>,
  ) {}

  /**
   * Get all deals with their associated contacts
   */
  async findAll(): Promise<Deal[]> {
    return await this.dealRepository.find({
      relations: ['contact', 'lineItems'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single deal by ID
   */
  async findOne(id: string): Promise<Deal> {
    const deal = await this.dealRepository.findOne({
      where: { id },
      relations: ['contact', 'lineItems'],
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    return deal;
  }

  /**
   * Get all deals for a specific contact
   */
  async findByContact(contactId: string): Promise<Deal[]> {
    return await this.dealRepository.find({
      where: { contactId },
      relations: ['lineItems'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all line items for a specific deal
   */
  async findLineItems(dealId: string): Promise<LineItem[]> {
    return await this.lineItemRepository.find({
      where: { dealId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a new deal
   */
  async create(createDealDto: CreateDealDto): Promise<Deal> {
    const deal = this.dealRepository.create(createDealDto);
    return await this.dealRepository.save(deal);
  }

  /**
   * Update a deal
   */
  async update(id: string, updateDealDto: UpdateDealDto): Promise<Deal> {
    const deal = await this.findOne(id);
    Object.assign(deal, updateDealDto);
    return await this.dealRepository.save(deal);
  }

  /**
   * Delete a deal
   */
  async remove(id: string): Promise<void> {
    const deal = await this.findOne(id);
    await this.dealRepository.remove(deal);
  }
}
