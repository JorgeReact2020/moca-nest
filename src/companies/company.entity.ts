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
import { Contact } from '@contacts/contact.entity';

/**
 * Company entity representing companies associated with contacts from HubSpot
 */
@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hubspot_id', unique: true })
  @Index()
  hubspotId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  domain: string | null;

  // Many companies can belong to one contact
  @ManyToOne(() => Contact, (contact) => contact.companies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column({ name: 'contact_id' })
  contactId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
