#!/bin/bash

# Test HubSpot webhook with proper signature
# Make sure your app is running: npm run start:dev

SIGNATURE="f99b5d737a14df9347e11b8c5488173f1d130314c739e235ca47f637afe72a37"

echo "Testing HubSpot webhook with v1 signature..."
echo "Signature: $SIGNATURE"
echo ""

curl -X POST http://localhost:3000/webhooks/hubspot \
  -H "Content-Type: application/json" \
  -H "X-HubSpot-Signature: $SIGNATURE" \
  -H "X-HubSpot-Signature-Version: v1" \
  -d @test-webhook-payload.json \
  -v

echo ""
echo "Done!"
