import { Company } from '@companies/company.entity';
import { Deal } from '@deals/deal.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  // Moca API sync tracking
  @Column({ name: 'moca_user_id', type: 'varchar', nullable: true })
  mocaUserId: string | null;

  @Column({ name: 'synced_at', type: 'timestamp', nullable: true })
  syncedAt: Date | null;

  @Column({
    name: 'sync_status',
    type: 'boolean',
    nullable: true,
    default: false,
  })
  syncStatus: boolean | null;

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
