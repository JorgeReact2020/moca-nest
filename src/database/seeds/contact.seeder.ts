import { DataSource } from 'typeorm';
import { Contact } from '../../contacts/contact.entity';

export class ContactSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const contactRepository = dataSource.getRepository(Contact);

    // Check if contacts already exist
    const count = await contactRepository.count();
    if (count > 0) {
      console.log('Contacts already exist, skipping seed...');
      return;
    }

    // Sample contacts data
    const contacts = [
      {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@example.com',
      },
      {
        firstname: 'Jane',
        lastname: 'Smith',
        email: 'jane.smith@example.com',
      },
      {
        firstname: 'Michael',
        lastname: 'Johnson',
        email: 'michael.johnson@example.com',
      },
      {
        firstname: 'Emily',
        lastname: 'Davis',
        email: 'emily.davis@example.com',
      },
      {
        firstname: 'David',
        lastname: 'Wilson',
        email: 'david.wilson@example.com',
      },
      {
        firstname: 'Sarah',
        lastname: 'Brown',
        email: 'sarah.brown@example.com',
      },
      {
        firstname: 'Robert',
        lastname: 'Martinez',
        email: 'robert.martinez@example.com',
      },
      {
        firstname: 'Lisa',
        lastname: 'Garcia',
        email: 'lisa.garcia@example.com',
      },
      {
        firstname: 'James',
        lastname: 'Taylor',
        email: 'james.taylor@example.com',
      },
      {
        firstname: 'Maria',
        lastname: 'Anderson',
        email: 'maria.anderson@example.com',
      },
    ];

    // Insert contacts
    await contactRepository.save(contacts);

    console.log(`✅ Successfully seeded ${contacts.length} contacts!`);
  }
}
