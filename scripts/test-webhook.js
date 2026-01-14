#!/usr/bin/env node

/**
 * Test script for webhook endpoint
 * Usage: node scripts/test-webhook.js [api_key] [webhook_url]
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Get API key and URL from command line or use defaults
const apiKey = process.argv[2] || 'test_api_key_123';
const webhookUrl = process.argv[3] || 'http://localhost:3001/api/webhooks/settlement';

// Test payload
const payload = {
  event: 'market.settled',
  marketId: 'test_market_' + Date.now(),
  marketStatus: 'SETTLED',
  outcome: 'yes',
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

console.log('Testing Webhook Endpoint');
console.log('========================');
console.log('URL:', webhookUrl);
console.log('API Key:', apiKey.substring(0, 10) + '...');
console.log('Payload:', payloadString);
console.log('Signature:', signature);
console.log('');

// Parse URL
const url = new URL(webhookUrl);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Merchant-API-Key': apiKey,
    'X-Merchant-Signature': signature,
  },
};

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Headers:', res.headers);
    console.log('');
    
    try {
      const json = JSON.parse(data);
      console.log('Response Body:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Response Body (raw):');
      console.log(data);
    }

    if (res.statusCode === 200) {
      console.log('');
      console.log('✅ Webhook test successful!');
    } else {
      console.log('');
      console.log('❌ Webhook test failed with status:', res.statusCode);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  console.error('');
  console.error('Make sure:');
  console.error('1. The Next.js dev server is running (npm run dev)');
  console.error('2. The webhook URL is correct');
  console.error('3. The database is running (docker-compose up -d postgres)');
  process.exit(1);
});

req.write(payloadString);
req.end();

