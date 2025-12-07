import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Company } from '@companies/company.entity';
import { Deal } from '@deals/deal.entity';

/**
 * Contact entity representing contacts synchronized from HubSpot
 */
@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstname: string;

  @Column()
  lastname: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ name: 'hubspot_id', unique: true, nullable: true })
  @Index()
  hubspotId: string;

  // One contact can have many companies
  @OneToMany(() => Company, (company) => company.contact, {
    cascade: true,
  })
  companies: Company[];

  // One contact can have many deals
  @OneToMany(() => Deal, (deal) => deal.contact, {
    cascade: true,
  })
  deals: Deal[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
