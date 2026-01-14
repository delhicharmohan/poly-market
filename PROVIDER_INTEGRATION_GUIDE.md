# Indimarket Webhook Integration Guide for Providers

This document outlines the webhook integration requirements for the Indimarket merchant platform. Please implement the following changes to send market settlement notifications to our system.

## Overview

The Indimarket platform requires webhook notifications when markets are settled. Upon receiving these notifications, our system will automatically:
- Update market status in our database
- Mark wagers as won or lost
- Credit winnings to user wallets
- Update transaction records

## Webhook Endpoint

**URL:** `https://your-merchant-domain.com/api/webhooks/settlement`

**Method:** `POST`

**Content-Type:** `application/json`

## Authentication

### API Key and Signature Verification

Webhook requests use the **same API key** as your regular API calls. No separate webhook secret is required.

**Required Headers:**
- `X-Merchant-API-Key`: Your API key (same as used for API calls)
- `X-Merchant-Signature`: HMAC-SHA256 signature (same format as API calls)

**Signature Calculation:**
```
signature = HMAC-SHA256(api_key, request_body_json_string)
```

**Note:** The signature uses your **API key** as the secret (same as regular API requests).

**Example (JavaScript/Node.js):**
```javascript
const crypto = require('crypto');

function generateWebhookSignature(apiKey, payload) {
  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', apiKey)
    .update(payloadString)
    .digest('hex');
}

const payload = { /* webhook payload */ };
const apiKey = 'your_api_key'; // Same API key used for API calls
const signature = generateWebhookSignature(apiKey, payload);

// Include in headers
headers['X-Merchant-API-Key'] = apiKey;
headers['X-Merchant-Signature'] = signature;
```

**Example (Python):**
```python
import hmac
import hashlib
import json

def generate_webhook_signature(api_key, payload):
    payload_string = json.dumps(payload, sort_keys=True)
    signature = hmac.new(
        api_key.encode('utf-8'),
        payload_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature

payload = { /* webhook payload */ }
api_key = 'your_api_key'  # Same API key used for API calls
signature = generate_webhook_signature(api_key, payload)

# Include in headers
headers['X-Merchant-API-Key'] = api_key
headers['X-Merchant-Signature'] = signature
```

**Important:** 
- Use the **same API key** that you use for regular API calls (e.g., placing wagers)
- Use the **raw JSON string** (before parsing) for signature calculation
- Ensure consistent JSON serialization (same key order, no extra whitespace)
- The signature calculation is identical to your regular API request signatures

## Webhook Payload Structure

### Required Fields

```json
{
  "event": "market.settled",
  "marketId": "string",
  "marketStatus": "SETTLED",
  "outcome": "yes" | "no"
}
```

### Optional Fields

```json
{
  "event": "market.settled",
  "marketId": "string",
  "marketStatus": "SETTLED",
  "outcome": "yes" | "no",
  "timestamp": 1234567890
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | Yes | Event type. Must be `"market.settled"` or `"market.settlement"` |
| `marketId` | string | Yes | Unique identifier of the settled market |
| `marketStatus` | string | Yes | Market status. Must be `"SETTLED"` |
| `outcome` | string | Yes | Winning outcome: `"yes"` or `"no"` |
| `timestamp` | number | No | Unix timestamp (milliseconds) of settlement. Defaults to current time |

**Note:** The system automatically processes all wagers for the market based on the outcome. You don't need to send individual wager details.

## Example Payloads

### Payload Format

```json
{
  "event": "market.settled",
  "marketId": "market_abc123",
  "marketStatus": "SETTLED",
  "outcome": "yes",
  "timestamp": 1704567890000
}
```

When a settlement webhook is received, our system will:
1. Find all wagers for the specified market
2. Mark wagers matching the outcome as "WON"
3. Mark other wagers as "LOST"
4. Calculate payouts automatically using `potential_win` (stake × odds)
5. Credit winnings to user wallets
6. Create wallet transactions for all winning users

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Market settlement processed successfully",
  "marketId": "market_abc123",
  "marketStatus": "SETTLED",
  "outcome": "yes"
}
```

### Error Responses

**Status Code:** `400 Bad Request`
```json
{
  "message": "Missing required fields: event, marketId, marketStatus"
}
```

**Status Code:** `401 Unauthorized`
```json
{
  "message": "Invalid signature"
}
```
or
```json
{
  "message": "API key is required. Please include X-Merchant-API-Key header."
}
```

**Status Code:** `500 Internal Server Error`
```json
{
  "message": "Failed to process settlement webhook",
  "error": "Detailed error message (development only)"
}
```

## Implementation Requirements

### 1. Webhook Delivery

- **HTTPS Only:** All webhooks must be sent over HTTPS
- **Retry Logic:** Implement exponential backoff retry (recommended: 3-5 retries)
- **Timeout:** Set request timeout to 30 seconds
- **Idempotency:** Handle duplicate deliveries gracefully (our system is idempotent)

### 2. When to Send Webhooks

Send webhook immediately when:
- A market status changes to "SETTLED"
- Market outcome is determined
- All wagers for the market need to be settled

### 3. Error Handling

- **4xx Errors:** Do not retry (client error - check payload/authentication)
- **5xx Errors:** Retry with exponential backoff
- **Network Errors:** Retry with exponential backoff
- **Timeout:** Retry with exponential backoff

### 4. Retry Strategy (Recommended)

```
Attempt 1: Immediate
Attempt 2: After 1 minute
Attempt 3: After 5 minutes
Attempt 4: After 15 minutes
Attempt 5: After 1 hour
```

## Testing

### Test Endpoint

Before going live, test the webhook endpoint:

**GET Request:**
```bash
curl https://your-merchant-domain.com/api/webhooks/settlement
```

**Expected Response:**
```json
{
  "message": "Webhook endpoint is active",
  "endpoint": "/api/webhooks/settlement",
  "method": "POST",
  "requiredHeaders": ["X-Merchant-API-Key"],
  "optionalHeaders": ["X-Merchant-Signature", "X-Webhook-Signature"],
  "requiredFields": ["event", "marketId", "marketStatus"],
  "note": "Uses the same API key as regular API calls. Signature is calculated using HMAC-SHA256 with the API key as the secret."
}
```

### Test Webhook Delivery

```bash
# Example test payload
# First, calculate signature using your API key
API_KEY="your_api_key"
PAYLOAD='{"event":"market.settled","marketId":"test_market_123","marketStatus":"SETTLED","outcome":"yes"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$API_KEY" | cut -d' ' -f2)

curl -X POST https://your-merchant-domain.com/api/webhooks/settlement \
  -H "Content-Type: application/json" \
  -H "X-Merchant-API-Key: $API_KEY" \
  -H "X-Merchant-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

## Security Considerations

1. **Webhook Secret:** 
   - Use the same API key as your regular API calls
   - Keep the API key secure
   - Rotate API keys periodically
   - Never commit API keys to version control

2. **HTTPS Only:**
   - Never send webhooks over HTTP
   - Use TLS 1.2 or higher

3. **IP Whitelisting (Optional):**
   - We can provide our server IPs for whitelisting if needed

4. **Rate Limiting:**
   - We may implement rate limiting - contact us if you need higher limits

## Integration Checklist

- [ ] Webhook endpoint URL configured
- [ ] API key available (same as used for API calls)
- [ ] Signature generation implemented (HMAC-SHA256 using API key)
- [ ] Payload structure matches specification
- [ ] Retry logic implemented for failed deliveries
- [ ] Error handling for 4xx/5xx responses
- [ ] Testing completed with test endpoint
- [ ] Monitoring/alerting set up for webhook failures
- [ ] Documentation updated with webhook URL

## Support and Contact

For questions or issues regarding webhook integration:

- **Technical Support:** [Your contact email]
- **Webhook Issues:** Check server logs and retry failed deliveries
- **Secret Rotation:** Contact us to update webhook secret

## Example Implementation

### Node.js Example

```javascript
const axios = require('axios');
const crypto = require('crypto');

async function sendSettlementWebhook(webhookUrl, apiKey, payload) {
  // Generate signature using API key (same as API calls)
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', apiKey)
    .update(payloadString)
    .digest('hex');

  // Send webhook with retry logic
  const maxRetries = 5;
  const retryDelays = [0, 60000, 300000, 900000, 3600000]; // 0, 1min, 5min, 15min, 1hr

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-API-Key': apiKey,
          'X-Merchant-Signature': signature,
        },
        timeout: 30000,
      });

      if (response.status === 200) {
        console.log('Webhook delivered successfully');
        return response.data;
      }
    } catch (error) {
      const status = error.response?.status;
      
      // Don't retry on 4xx errors (client errors)
      if (status >= 400 && status < 500) {
        console.error('Client error, not retrying:', error.message);
        throw error;
      }

      // Retry on 5xx or network errors
      if (attempt < maxRetries - 1) {
        const delay = retryDelays[attempt];
        console.log(`Webhook failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Webhook failed after all retries:', error.message);
        throw error;
      }
    }
  }
}

// Usage
const payload = {
  event: 'market.settled',
  marketId: 'market_abc123',
  marketStatus: 'SETTLED',
  outcome: 'yes',
  timestamp: Date.now(),
};

sendSettlementWebhook(
  'https://your-merchant-domain.com/api/webhooks/settlement',
  'your_api_key',  // Same API key used for API calls
  payload
);
```

### Python Example

```python
import requests
import hmac
import hashlib
import json
import time

def generate_signature(api_key, payload):
    payload_string = json.dumps(payload, sort_keys=True)
    signature = hmac.new(
        api_key.encode('utf-8'),
        payload_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature

def send_settlement_webhook(webhook_url, api_key, payload):
    # Generate signature using API key (same as API calls)
    signature = generate_signature(api_key, payload)
    
    headers = {
        'Content-Type': 'application/json',
        'X-Merchant-API-Key': api_key,
        'X-Merchant-Signature': signature,
    }
    
    # Retry configuration
    max_retries = 5
    retry_delays = [0, 60, 300, 900, 3600]  # seconds
    
    for attempt in range(max_retries):
        try:
            response = requests.post(
                webhook_url,
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                print('Webhook delivered successfully')
                return response.json()
            elif 400 <= response.status_code < 500:
                # Don't retry client errors
                print(f'Client error, not retrying: {response.status_code}')
                response.raise_for_status()
            else:
                # Retry server errors
                raise requests.exceptions.HTTPError(f'Server error: {response.status_code}')
                
        except (requests.exceptions.RequestException, requests.exceptions.HTTPError) as e:
            if attempt < max_retries - 1:
                delay = retry_delays[attempt]
                print(f'Webhook failed, retrying in {delay}s (attempt {attempt + 1}/{max_retries})')
                time.sleep(delay)
            else:
                print(f'Webhook failed after all retries: {e}')
                raise

# Usage
payload = {
    'event': 'market.settled',
    'marketId': 'market_abc123',
    'marketStatus': 'SETTLED',
    'outcome': 'yes',
    'timestamp': int(time.time() * 1000),
}

send_settlement_webhook(
    'https://your-merchant-domain.com/api/webhooks/settlement',
    'your_api_key',  # Same API key used for API calls
    payload
)
```

## Version History

- **v1.0** (2024-01-05): Initial webhook integration specification

---

**Document Version:** 1.0  
**Last Updated:** January 5, 2024  
**Contact:** [Your contact information]

