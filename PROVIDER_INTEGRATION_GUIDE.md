# Merchant Integration Guide v1.0

Welcome to the **Antigravity B2B Betting Network**. This document outlines the technical requirements for integrating your merchant platform with our liquidity pool.

## 1. Authentication

All requests to the Antigravity API must be authenticated using your assigned **API Key**.

### Headers Required:
| Header | Description | Required For |
| :--- | :--- | :--- |
| `X-Merchant-API-Key` | Your raw API Key | All Requests |
| `X-Merchant-Signature` | HMAC-SHA256 signature of the request body | POST/PUT/DELETE |
| `Content-Type` | `application/json` | Requests with Body |

### Signature Generation
For any request containing a body, you must generate a hex-encoded HMAC-SHA256 signature.

*   **Secret**: Your raw API Key.
*   **Payload**: The exact JSON string of the request body.

**Node.js Example:**
```javascript
const crypto = require('crypto');

const apiKey = 'your_api_key';
const body = { marketId: '...', selection: 'yes', stake: 100 };
const bodyStr = JSON.stringify(body);

const signature = crypto
  .createHmac('sha256', apiKey)
  .update(bodyStr)
  .digest('hex');

// Headers:
// X-Merchant-API-Key: your_api_key
// X-Merchant-Signature: [signature]
```

---

## 2. API Endpoints

**Base URL (Local)**: `http://localhost:3000/v1`  
**Base URL (Production)**: `https://api.antigravity.network/v1`

### 2.1 List Markets
Fetch all active prediction markets available for betting.

*   **Endpoint**: `GET /markets`
*   **Query Parameters**:
    *   `category` (Optional): Filter by market type. Valid values:
        *   `Crypto`, `Finance`, `NFL`, `NBA`, `Cricket`, `Football`, `Politics`, `Election`.
    *   `term` (Optional): Filter by resolution horizon. Valid values:
        *   `Ultra Short`: Resolution within 7 days.
        *   `Short`: Resolution between 8 to 21 days.
        *   `Long`: Resolution between 28 to 90 days.
    *   `status` (Optional): Filter by market status. Defaults to `OPEN`.
        *   `OPEN`: Active markets accepting bets.
        *   `RESOLVING`: Closed markets where the outcome is being determined.
*   **Response**: `Array<Market>`

> [!NOTE]
> Markets enter a **Cooling-off Period** 5 minutes before their `closure_timestamp`. During this window, no new wagers will be accepted to prevent "pool sniping."

**Market Object Schema:**
```json
{
  "id": "uuid",
  "title": "Will Bitcoin exceed $100k?",
  "status": "OPEN",
  "category": "Crypto",
  "term": "Ultra Short",
  "pool_yes": "1500.00",
  "pool_no": "1200.00",
  "total_pool": "2700.00",
  "closure_timestamp": 1735689600000,
  "resolution_timestamp": 1735691400000,
  "metrics": {
    "yesPercent": 65,
    "noPercent": 35
  }
}
```

*   **metrics** (optional): When present, the merchant displays **percentage** on the market card: `yesPercent` / `noPercent` (0–100), or `percentage` (yes share).

### 2.2 Place Wager
Place a bet on a specific market outcome.

*   **Endpoint**: `POST /wager`
*   **Body Parameters**:
    *   `marketId` (UUID): The ID of the market.
    *   `selection` (String): `"yes"` or `"no"`.
    *   `stake` (Number): The amount to wager (e.g., `100.50`).
    *   `userId` (String, Optional): Your internal user ID (e.g., Firebase UID). This will be echoed back in the settlement webhook for your payout processing.

> [!IMPORTANT]
> **Liquidity Guard**: To protect the integrity of the Pari-mutuel pool, no single wager may exceed **50% of the current total pool** at the time of placement. 

**Success Response (201 Created):**
```json
{
  "status": "accepted",
  "wagerId": "wager-uuid",
  "marketId": "market-uuid",
  "stake": 100.50,
  "selection": "yes",
  "odds": {
    "yes": 1.85,
    "no": 2.10
  },
  "potentialWin": 165.42,
  "metrics": {
    "yesPercent": 65,
    "noPercent": 35
  }
}
```

*   **potentialWin** (recommended): Estimated possible winning **after platform commission**. The merchant shows this in the wager confirmation; it must not equal stake (commission is deducted). If omitted, the merchant shows "— (calculated at settlement, after commission)".
*   **metrics** (optional): Included in every wager placement response (and in WebSocket updates). The merchant uses **percentage** on the market card: `yesPercent` / `noPercent` (0–100), or a single `percentage` (yes share; no = 100 − percentage).

---

## 3. Webhook Notifications

If you have configured a `webhook_url` in your merchant settings, Antigravity will push POST notifications to your server when events occur.

### Settlement & Payout Notification
Sent immediately when a market status changes to "SETTLED". Use this to credit your users' wallets.

*   **Pari-mutuel Payouts**: The `payout` field in each wager object is the final amount to credit, calculated after the platform rake and rounded down to the nearest cent.

*   **Method**: `POST`
*   **Headers**:
    *   `X-Webhook-Signature`: HMAC-SHA256 signature of the payload using your API Key.
    *   `X-Merchant-API-Key`: Your raw API Key (used for source identification).
*   **Payload**:
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

*   **wagers** (required): List every wager on this market. For each: `wagerId` (from place-wager response), optional `userId` (merchant user id), `won` (true/false), `payout` (final amount to credit; pari-mutuel after rake; use 0 when `won: false`). The merchant credits only entries with `won: true` using the `payout` value.

---

## 4. Error Codes

| Code | Meaning |
| :--- | :--- |
| `401` | Missing or invalid API Key. |
| `403` | Invalid Signature or IP not whitelisted. |
| `400` | Invalid parameters or Market is closed for betting. |
| `404` | Market not found. |
| `500` | Internal server error. |
