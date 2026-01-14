#!/usr/bin/env node

/**
 * Test script to simulate a market settlement webhook
 * Usage: node scripts/test-settlement.js [api_key] [market_id] [outcome]
 */

const crypto = require('crypto');
const http = require('http');

const apiKey = process.argv[2] || 'test_api_key_123';
const marketId = process.argv[3] || 'test_market_123';
const outcome = process.argv[4] || 'yes';
const baseUrl = process.argv[5] || 'http://localhost:3001';

// Create test payload
const payload = {
  event: 'market.settled',
  marketId: marketId,
  marketStatus: 'SETTLED',
  outcome: outcome,
  timestamp: Date.now(),
};

// Generate signature
function generateSignature(apiKey, payload) {
  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', apiKey)
    .update(payloadString)
    .digest('hex');
}

const signature = generateSignature(apiKey, payload);
const payloadString = JSON.stringify(payload);

console.log('🧪 Testing Market Settlement Webhook\n');
console.log('='.repeat(60));
console.log('Market ID:', marketId);
console.log('Outcome:', outcome);
console.log('API Key:', apiKey.substring(0, 10) + '...');
console.log('Signature:', signature);
console.log('Payload:', payloadString);
console.log('='.repeat(60) + '\n');

const url = new URL(`${baseUrl}/api/webhooks/settlement`);

const options = {
  hostname: url.hostname,
  port: url.port || 3001,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Merchant-API-Key': apiKey,
    'X-Merchant-Signature': signature,
  },
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response:', data);
    console.log('');
    
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        if (json.success) {
          console.log('✅ Settlement processed successfully!');
          console.log('');
          console.log('Next steps:');
          console.log('1. Run: node scripts/verify-settlements.js');
          console.log('2. Check the database for updated wagers and wallet transactions');
        }
      } catch (e) {
        console.log('⚠️  Response is not JSON');
      }
    } else {
      console.log('❌ Settlement failed');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  console.error('');
  console.error('Make sure:');
  console.error('1. The Next.js dev server is running (npm run dev)');
  console.error('2. The webhook endpoint is accessible');
  console.error('3. The database is running (docker-compose up -d postgres)');
  process.exit(1);
});

req.write(payloadString);
req.end();


