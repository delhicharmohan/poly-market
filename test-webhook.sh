#!/bin/bash

# Test webhook endpoint
# Usage: ./test-webhook.sh [api_key]

API_KEY="${1:-test_api_key_123}"
BASE_URL="${2:-http://localhost:3001}"

echo "Testing Webhook Endpoint"
echo "========================"
echo "URL: $BASE_URL/api/webhooks/settlement"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Create test payload
PAYLOAD='{"event":"market.settled","marketId":"test_market_123","marketStatus":"SETTLED","outcome":"yes","timestamp":'$(date +%s000)'}'

# Generate signature (using Node.js for cross-platform compatibility)
SIGNATURE=$(node -e "
const crypto = require('crypto');
const payload = '$PAYLOAD';
const apiKey = '$API_KEY';
const signature = crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
console.log(signature);
")

echo "Payload: $PAYLOAD"
echo "Signature: $SIGNATURE"
echo ""

# Test GET endpoint first
echo "1. Testing GET endpoint (health check)..."
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/api/webhooks/settlement")
echo "Response: $GET_RESPONSE"
echo ""

# Test POST endpoint
echo "2. Testing POST endpoint with signature..."
POST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks/settlement" \
  -H "Content-Type: application/json" \
  -H "X-Merchant-API-Key: $API_KEY" \
  -H "X-Merchant-Signature: $SIGNATURE" \
  -d "$PAYLOAD")

echo "Response: $POST_RESPONSE"
echo ""

# Check if response contains success
if echo "$POST_RESPONSE" | grep -q "success\|error\|message"; then
  echo "✅ Webhook endpoint is responding!"
else
  echo "❌ Unexpected response. Make sure:"
  echo "   - Next.js dev server is running (npm run dev)"
  echo "   - Route file exists at app/api/webhooks/settlement/route.ts"
  echo "   - Server has been restarted after creating the route"
fi

