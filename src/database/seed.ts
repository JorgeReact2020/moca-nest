import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { ContactSeeder } from './seeds/contact.seeder';
import { Contact } from '../contacts/contact.entity';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'moca_nest',
  entities: [Contact],
  synchronize: false,
});

async function runSeeders() {
  try {
    console.log('🌱 Starting database seeding...');

    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const contactSeeder = new ContactSeeder();
    await contactSeeder.run(AppDataSource);

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

void runSeeders();
