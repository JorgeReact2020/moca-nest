const crypto = require('crypto');

// Your webhook secret from .env
const clientSecret = '889cda9f-f522-4c4b-814b-50f6d79d9c1a';

// Example payload (must match EXACTLY what HubSpot sends)
const requestBody = JSON.stringify([
  {
    "eventId": 714285774,
    "subscriptionId": 4849549,
    "portalId": 50687303,
    "appId": 25681700,
    "occurredAt": 1765043528476,
    "subscriptionType": "contact.propertyChange",
    "attemptNumber": 0,
    "objectId": 173595202426,
    "propertyName": "firstname",
    "propertyValue": "Briane",
    "changeSource": "CRM_UI",
    "sourceId": "userId:10202051"
  }
]);

console.log('=== HubSpot v1 Signature Test ===\n');
console.log('Client Secret:', clientSecret);
console.log('\nRequest Body:', requestBody);

// HubSpot v1 signature algorithm:
// 1. Concatenate: clientSecret + requestBody
const sourceString = clientSecret + requestBody;
console.log('\nSource String (first 100 chars):', sourceString.substring(0, 100) + '...');

// 2. Create SHA-256 hash (NOT HMAC)
const expectedSignature = crypto.createHash('sha256')
  .update(sourceString)
  .digest('hex');

console.log('\n=== Expected Signature ===');
console.log(expectedSignature);
console.log('\nUse this as X-HubSpot-Signature header when testing');
