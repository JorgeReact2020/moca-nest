# Testing Moca API Sync

This guide explains how to test the HubSpot → Local DB → External Moca API sync flow using the mock API server.

## Setup

### 1. Install Express (if not already installed)
```bash
npm install express
```

### 2. Start the Mock Moca API
```bash
node mock-moca-api.js
```

You should see:
```
╔════════════════════════════════════════════════════╗
║        Mock Moca API Server Running                ║
╚════════════════════════════════════════════════════╝

🚀 Server: http://localhost:3001
```

### 3. Update Your .env File
```bash
MOCA_API_URL=http://localhost:3001
```

### 4. Start Your NestJS App
In a separate terminal:
```bash
npm run start:dev
```

## Testing Scenarios

### Scenario 1: New Contact Creation (POST)

**Trigger:** Create or update a contact in HubSpot

**Expected Flow:**
1. HubSpot webhook fires → your app receives it
2. Contact saved to local database (`contacts` table)
3. `MocaService.ping()` checks if mock API is available
4. `MocaService.syncContact()` sends POST to `/client`
5. Mock API returns `mocaUserId` (e.g., "moca_1")
6. Local DB updated with:
   - `moca_user_id = "moca_1"`
   - `synced_at = current timestamp`
   - `sync_status = true`

**Check Logs:**
```bash
# Your NestJS app logs:
[MocaService] Checking if Moca API is available...
[MocaService] Moca API is available
[MocaService] Syncing contact... to Moca API
[MocaService] Successfully synced contact... to Moca API with ID: moca_1

# Mock API logs:
[2025-12-07T...] GET /health
✓ Health check passed
[2025-12-07T...] POST /client
Creating new contact: { email: '...', firstName: '...', ... }
✓ Created contact moca_1 - test@example.com
```

**Verify in Database:**
```sql
SELECT id, email, moca_user_id, synced_at, sync_status
FROM contacts
WHERE email = 'test@example.com';
```

### Scenario 2: Contact Update (PUT)

**Trigger:** Update the same contact again in HubSpot

**Expected Flow:**
1. Webhook fires with updated data
2. Contact updated in local database
3. `MocaService.syncContact()` sees `mocaUserId` exists
4. Sends PUT to `/client/moca_1`
5. Mock API updates the contact
6. Local DB updated with new `synced_at`, `sync_status = true`

**Check Mock API:**
```bash
# View all contacts in mock API:
curl http://localhost:3001/clients
```

### Scenario 3: API Downtime (Error Handling)

**Simulate API Down:**
```bash
curl -X POST http://localhost:3001/admin/simulate-downtime \
  -H "Content-Type: application/json" \
  -d '{"duration": 30000}'
```

**Trigger:** Update a contact in HubSpot

**Expected Flow:**
1. Webhook fires
2. Contact saved to local database
3. `MocaService.ping()` fails (API returns 503)
4. Sync is skipped
5. Local DB updated with:
   - `synced_at = current timestamp`
   - `sync_status = false`
6. Webhook processing continues (doesn't fail)

**Check Logs:**
```bash
# Your NestJS app logs:
[MocaService] Checking if Moca API is available...
[MocaService] Moca API is not available
[WebhookService] Failed to sync contact... to Moca API: ...
```

**Find Failed Syncs:**
```sql
SELECT id, email, synced_at, sync_status
FROM contacts
WHERE sync_status = false;
```

### Scenario 4: Retry After Failure

**Wait for API to come back online** (or restart mock API)

**Trigger:** Update the same contact again in HubSpot

**Expected Flow:**
1. Webhook fires
2. `MocaService.ping()` succeeds
3. Sync succeeds (uses PUT since `mocaUserId` exists)
4. `sync_status` changed from `false` to `true`

## Mock API Admin Endpoints

### Clear All Contacts
```bash
curl -X DELETE http://localhost:3001/admin/clear
```

### Simulate Downtime (30 seconds)
```bash
curl -X POST http://localhost:3001/admin/simulate-downtime \
  -H "Content-Type: application/json" \
  -d '{"duration": 30000}'
```

### View All Contacts
```bash
curl http://localhost:3001/clients
```

### View Specific Contact
```bash
curl http://localhost:3001/client/moca_1
```

## Monitoring Sync Status

### Check Sync Success Rate
```sql
SELECT
  sync_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM contacts
WHERE synced_at IS NOT NULL
GROUP BY sync_status;
```

### Find Contacts Never Synced
```sql
SELECT id, email, created_at
FROM contacts
WHERE synced_at IS NULL;
```

### Find Recent Failed Syncs
```sql
SELECT id, email, synced_at, sync_status
FROM contacts
WHERE sync_status = false
  AND synced_at > NOW() - INTERVAL '1 hour'
ORDER BY synced_at DESC;
```

### Find Contacts Ready for Retry
```sql
SELECT id, email, synced_at
FROM contacts
WHERE sync_status = false
  AND synced_at < NOW() - INTERVAL '5 minutes';
```

## Troubleshooting

### Mock API Not Responding
- Check if it's running: `curl http://localhost:3001/health`
- Check port 3001 is available: `lsof -i :3001`
- Restart: `node mock-moca-api.js`

### Sync Not Happening
1. Check `.env` has `MOCA_API_URL=http://localhost:3001`
2. Check logs for error messages
3. Verify HubSpot webhook is firing (check webhook logs)
4. Verify contact is saved to local DB first

### Sync Status Always False
1. Check if mock API is running
2. Test health endpoint: `curl http://localhost:3001/health`
3. Check for network issues between your app and mock API

## Next Steps

Once testing is complete with the mock API:

1. **Production Ready**: The real Moca API should implement the same endpoints:
   - `GET /health` - Health check
   - `POST /client` - Create contact
   - `PUT /client/:mocaUserId` - Update contact

2. **Switch to Production**: Update `.env`:
   ```bash
   MOCA_API_URL=https://real-moca-api.com
   MOCA_API_KEY=your_production_key
   ```

3. **Monitor**: Watch sync status in production:
   - Set up alerts for `sync_status = false`
   - Log sync failures for investigation
   - Consider retry job for old failures
