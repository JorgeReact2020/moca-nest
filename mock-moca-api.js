/**
 * Mock Moca API Server
 *
 * Simple Express server to simulate the external Moca API
 * for testing the sync integration before the real API is ready.
 *
 * Usage:
 *   node mock-moca-api.js
 *
 * Then update .env:
 *   MOCA_API_URL=http://localhost:3001
 */

const express = require('express');
const app = express();
const PORT = 3001;

// Store contacts in memory (resets when server restarts)
const contacts = new Map();
let nextId = 1;

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Health Check Endpoint
 * Used by MocaService.ping() to verify API is available
 */
app.get('/health', (req, res) => {
  console.log('✓ Health check passed');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    contacts: contacts.size
  });
});

/**
 * Create New Contact (POST)
 * Called when mocaUserId doesn't exist yet
 */
app.post('/client', (req, res) => {
  console.log('Creating new contact:', req.body);

  const { email, firstname, lastname, phone, company, hubspotId } = req.body;

  // Validate required fields
  if (!email) {
    return res.status(400).json({
      error: 'Email is required'
    });
  }

  // Check if email already exists
  for (const [id, contact] of contacts.entries()) {
    if (contact.email === email) {
      console.log(`⚠️  Contact with email ${email} already exists (ID: ${id})`);
      return res.status(409).json({
        error: 'Contact with this email already exists',
        id: id,
        mocaUserId: id
      });
    }
  }

  // Create new contact
  const mocaUserId = `moca_${nextId++}`;
  contacts.set(mocaUserId, {
    id: mocaUserId,
    email,
    firstname,
    lastname,
    phone,
    company,
    hubspotId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  console.log(`✓ Created contact ${mocaUserId} - ${email}`);

  res.status(201).json({
    id: mocaUserId,
    message: 'Contact created successfully'
  });
});

/**
 * Update Existing Contact (PUT)
 * Called when mocaUserId already exists
 */
app.put('/client/:mocaUserId', (req, res) => {
  const { mocaUserId } = req.params;
  console.log(`Updating contact ${mocaUserId}:`, req.body);

  const contact = contacts.get(mocaUserId);

  if (!contact) {
    return res.status(404).json({
      error: 'Contact not found'
    });
  }

  const { email, firstname, lastname, phone, company, hubspotId } = req.body;

  // Update contact
  contacts.set(mocaUserId, {
    ...contact,
    email: email || contact.email,
    firstname: firstname !== undefined ? firstname : contact.firstname,
    lastname: lastname !== undefined ? lastname : contact.lastname,
    phone: phone !== undefined ? phone : contact.phone,
    company: company !== undefined ? company : contact.company,
    hubspotId: hubspotId !== undefined ? hubspotId : contact.hubspotId,
    updatedAt: new Date().toISOString()
  });

  console.log(`✓ Updated contact ${mocaUserId} - ${email || contact.email}`);

  res.json({
    id: mocaUserId,
    message: 'Contact updated successfully'
  });
});

/**
 * Get Contact by ID (for debugging)
 */
app.get('/client/:mocaUserId', (req, res) => {
  const { mocaUserId } = req.params;
  const contact = contacts.get(mocaUserId);

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  res.json(contact);
});

/**
 * List All Contacts (for debugging)
 */
app.get('/clients', (req, res) => {
  res.json({
    total: contacts.size,
    contacts: Array.from(contacts.values())
  });
});

/**
 * Simulate API Downtime (for testing error handling)
 * Call this endpoint to make the next health check fail
 */
let isDown = false;
app.post('/admin/simulate-downtime', (req, res) => {
  const { duration = 30000 } = req.body;
  isDown = true;
  console.log(`⚠️  Simulating API downtime for ${duration}ms`);

  setTimeout(() => {
    isDown = false;
    console.log('✓ API back online');
  }, duration);

  res.json({ message: `API will be down for ${duration}ms` });
});

// Override health check when down
app.use((req, res, next) => {
  if (isDown && req.path === '/health') {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  next();
});

/**
 * Clear all contacts (for testing)
 */
app.delete('/admin/clear', (req, res) => {
  const count = contacts.size;
  contacts.clear();
  nextId = 1;
  console.log(`🗑️  Cleared ${count} contacts`);
  res.json({ message: `Cleared ${count} contacts` });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║        Mock Moca API Server Running                ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log('\n📋 Available Endpoints:');
  console.log('   GET  /health              - Health check');
  console.log('   POST /client              - Create contact');
  console.log('   PUT  /client/:id          - Update contact');
  console.log('   GET  /client/:id          - Get contact');
  console.log('   GET  /clients             - List all contacts');
  console.log('\n🔧 Admin Endpoints:');
  console.log('   POST   /admin/simulate-downtime - Simulate API down');
  console.log('   DELETE /admin/clear             - Clear all contacts');
  console.log('\n💡 Update your .env file:');
  console.log(`   MOCA_API_URL=http://localhost:${PORT}`);
  console.log('\n');
});
