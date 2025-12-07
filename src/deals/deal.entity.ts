import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Contact } from '@contacts/contact.entity';
import { LineItem } from '@line-items/line-item.entity';

/**
 * Deal entity representing deals associated with contacts from HubSpot
 */
@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hubspot_id', unique: true })
  @Index()
  hubspotId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  stage: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number | null;

  @Column({ name: 'has_line_items', default: false })
  hasLineItems: boolean;

  // Many deals can belong to one contact
  @ManyToOne(() => Contact, (contact) => contact.deals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column({ name: 'contact_id' })
  contactId: string;

  // One deal can have many line items
  @OneToMany(() => LineItem, (lineItem) => lineItem.deal, {
    cascade: true,
  })
  lineItems: LineItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
