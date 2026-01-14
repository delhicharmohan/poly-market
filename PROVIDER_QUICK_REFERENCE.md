# Indimarket Webhook Integration - Quick Reference

## Webhook Endpoint

```
POST https://your-merchant-domain.com/api/webhooks/settlement
```

## Required Headers

```
Content-Type: application/json
X-Merchant-API-Key: <your_api_key>
X-Merchant-Signature: <HMAC-SHA256 signature>
```

## Signature Calculation

```javascript
// Use the same API key as your regular API calls
signature = HMAC-SHA256(api_key, JSON.stringify(payload))
```

## Minimum Payload

```json
{
  "event": "market.settled",
  "marketId": "market_123",
  "marketStatus": "SETTLED",
  "outcome": "yes"
}
```

## Full Payload (with timestamp)

```json
{
  "event": "market.settled",
  "marketId": "market_123",
  "marketStatus": "SETTLED",
  "outcome": "yes",
  "timestamp": 1704567890000
}
```

**Note:** The system automatically processes all wagers for the market. No need to send individual wager details.

## Response Codes

- `200 OK` - Success
- `400 Bad Request` - Invalid payload
- `401 Unauthorized` - Invalid signature
- `500 Internal Server Error` - Server error (retry)

## When to Send

Send webhook immediately when:
- Market status changes to "SETTLED"
- Market outcome is determined

## Retry Policy

- Retry on 5xx errors and network failures
- Don't retry on 4xx errors
- Recommended: 3-5 retries with exponential backoff

## Testing

```bash
curl -X GET https://your-merchant-domain.com/api/webhooks/settlement
```

For full documentation, see `PROVIDER_INTEGRATION_GUIDE.md`

