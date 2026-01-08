# Moca API Integration

## Overview
Automatic sync of HubSpot contacts to external Moca API when webhook fires.

## Flow
```
HubSpot → Webhook → Save to Database → Sync to Moca API
```

## Implementation

### 1. Database Changes
Added to `Contact` entity:
- `mocaUserId` (nullable) - stores ID from external Moca API
- `syncedAt` (nullable timestamp) - tracks last successful sync

### 2. New Files Created
- `src/config/moca.config.ts` - Configuration for Moca API
- `src/modules/moca/moca.service.ts` - Handles API calls to Moca
- `src/modules/moca/moca.module.ts` - NestJS module

### 3. Integration
- `WebhookService` now calls `MocaService.syncContact()` after saving contact
- If `mocaUserId` exists → PUT (update)
- If `mocaUserId` is null → POST (create)
- Stores returned `mocaUserId` for future updates

### 4. Error Handling
- Moca sync failures are logged but don't block webhook processing
- Uses retry logic (3 attempts by default)
- Will retry on next HubSpot webhook trigger

## Configuration

Add to `.env`:
```bash
MOCA_API_URL=https://moca-api.com
MOCA_API_KEY=your_api_key_here  # Optional for now
MOCA_RETRY_ATTEMPTS=3
MOCA_RETRY_DELAY=1000
```

Add to GitHub Secrets (for production):
- `MOCA_API_URL`
- `MOCA_API_KEY`

## Testing

1. Trigger HubSpot webhook by changing contact property
2. Check logs for "Syncing contact X to Moca API"
3. Verify `mocaUserId` and `syncedAt` are set in database
4. Next trigger should use PUT instead of POST

## API Payload Format

Sends to Moca API:
```json
{
  "email": "contact@example.com",
  "firstname": "John",
  "lastname": "Doe",
  "hubspotId": "12345"
}
```

Expects response:
```json
{
  "id": "moca-user-id-123"
}
```

## Next Steps

- [ ] Update GitHub Actions workflow to include Moca env vars
- [ ] Run database migration to add new columns
- [ ] Configure real Moca API URL and key
- [ ] Test with actual Moca API endpoint
