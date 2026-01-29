# Webhook Setup Guide

This document explains how to configure and use webhooks for receiving market settlement updates from the provider.

## Webhook Endpoint

**URL:** `POST /api/webhooks/settlement`

**Purpose:** Receive market settlement notifications from the provider and automatically:
- Update market status to "SETTLED"
- Mark winning/losing wagers
- Credit winnings to user wallets
- Update transaction records

## Configuration

### 1. No Additional Configuration Required

The webhook endpoint uses the **same API key** that merchants configure for API calls. No separate webhook secret is needed.

The provider will send:
- `X-Merchant-API-Key`: The merchant's API key
- `X-Merchant-Signature`: HMAC-SHA256 signature calculated using the API key

### 2. Provider Configuration

Configure the webhook URL in your provider's dashboard:

```
https://yourdomain.com/api/webhooks/settlement
```

Or for local development/testing:
```
https://your-ngrok-url.ngrok.io/api/webhooks/settlement
```

## Webhook Payload Format

The provider should send POST requests with the following payload:

### Required Fields

The B2B engine **must** send a `wagers` array (Antigravity format). We rely on the settlement webhook only and **never** use `potential_win` (no fallback). See **PROVIDER_INTEGRATION_GUIDE.md** for the full spec.

```json
{
  "event": "market.settled",
  "marketId": "382f1bcd-a198-4475-b7ac-5be3a10432aa",
  "marketStatus": "SETTLED",
  "outcome": "yes",
  "timestamp": 1706560599000,
  "wagers": [
    {
      "wagerId": "wager-uuid-12345",
      "userId": "merchant_user_id_from_your_platform",
      "won": true,
      "payout": 150.50
    },
    {
      "wagerId": "wager-uuid-67890",
      "userId": "another_user_id",
      "won": false,
      "payout": 0.00
    }
  ]
}
```

- **`wagers`** (required): Array of `{ wagerId, userId?, won, payout }`. Can be `[]` if there are no wagers.
- Every **winning** wager (matching `marketId` and winning `outcome`) must have an entry in `wagers` with **`won: true`** and a valid **`payout`** (number ≥ 0). If any winner is missing or has `won !== true`, the webhook returns `400` with `missingWagerIds` or `invalidWagerIds`.
- `wagerId` must match the B2B wager id (returned when the wager was placed).
- `payout` is the final amount to credit (pari-mutuel, after rake). Use `0` when `won: false`.

### Optional Fields

```json
{
  "marketTitle": "Will X happen?"
}
```

**Note:** We do not fall back to `potential_win` at any time. The B2B engine must send the correct `wagers` with `won` and `payout` for each wager (pari-mutuel).

## Security

### Signature Verification

The webhook endpoint verifies the signature using HMAC-SHA256:

**Headers:** 
- `X-Merchant-API-Key`: The merchant's API key
- `X-Merchant-Signature`: HMAC-SHA256 signature

The signature is calculated as:
```
HMAC-SHA256(api_key, request_body)
```

**Note:** Uses the same API key and signature format as regular API calls.

### Example Verification

```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

## Webhook Processing Flow

1. **Receive Webhook** → Verify signature
2. **Update Market** → Set status to "SETTLED"
3. **Update Wagers** → Mark as "WON" or "LOST"
4. **Calculate Payouts** → For winning wagers
5. **Credit Wallets** → Add winnings to user balances
6. **Create Transactions** → Record wallet transactions

## Testing

### Test the Endpoint

```bash
curl -X GET http://localhost:3001/api/webhooks/settlement
```

This returns endpoint information and required fields.

### Test with Sample Payload

```bash
curl -X POST http://localhost:3001/api/webhooks/settlement \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: your_signature_here" \
  -d '{
    "event": "market.settled",
    "marketId": "test_market_123",
    "marketStatus": "SETTLED",
    "outcome": "yes",
    "timestamp": 1234567890
  }'
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Market settlement processed successfully",
  "marketId": "market_123",
  "marketStatus": "SETTLED",
  "outcome": "yes"
}
```

### Error Response

```json
{
  "message": "Error message here",
  "error": "Stack trace (development only)"
}
```

## Database Updates

When a settlement webhook is received:

1. **markets table:**
   - `status` → "SETTLED"
   - `resolution_timestamp` → Updated

2. **wagers table:**
   - `status` → "WON" or "LOST"
   - `market_status` → "SETTLED"
   - `actual_payout` → Payout amount (for winners)

3. **wallet_transactions table:**
   - New transaction with type "win"
   - Amount = payout
   - Balance updated

## Troubleshooting

### Webhook Not Received

1. Check webhook URL is correct in provider dashboard
2. Verify server is accessible (use ngrok for local dev)
3. Check server logs for incoming requests

### Signature Verification Fails

1. Ensure the API key matches the one used for API calls
2. Verify signature is calculated correctly using the API key as the secret
3. Check that raw body is used for signature (not parsed JSON)
4. Ensure `X-Merchant-API-Key` header is included

### Wagers Not Updated

1. Verify marketId matches existing markets
2. Check wager IDs exist in database
3. Review database logs for constraint violations

## Local Development

For local development, use a tunneling service:

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start tunnel:**
   ```bash
   ngrok http 3001
   ```

3. **Use ngrok URL in provider:**
   ```
   https://abc123.ngrok.io/api/webhooks/settlement
   ```

## Production Considerations

1. **HTTPS Required:** Webhooks should only be sent over HTTPS
2. **IP Whitelisting:** Consider whitelisting provider IPs
3. **Rate Limiting:** Implement rate limiting to prevent abuse
4. **Idempotency:** Handle duplicate webhook deliveries
5. **Logging:** Log all webhook events for audit trail
6. **Monitoring:** Set up alerts for failed webhook processing

