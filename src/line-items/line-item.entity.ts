import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Deal } from '@deals/deal.entity';

/**
 * Line Item entity representing line items associated with deals from HubSpot
 */
@Entity('line_items')
export class LineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hubspot_id', unique: true })
  @Index()
  hubspotId: string;

  @Column()
  name: string;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number | null;

  @Column({ type: 'varchar', name: 'product_id', nullable: true })
  productId: string | null;

  // Many line items can belong to one deal
  @ManyToOne(() => Deal, (deal) => deal.lineItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'deal_id' })
  deal: Deal;

  @Column({ name: 'deal_id' })
  dealId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
