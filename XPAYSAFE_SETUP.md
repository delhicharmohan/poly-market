# xpaysafe Payment Gateway Setup

This app uses **xpaysafe** for merchandise "Buy Now" payments. On success, the webhook credits the user's wallet and creates the sale.

## 1. Environment variables

Add to `.env.local` (see `.env.local.example`):

- `XPAYSAFE_API_KEY` – Merchant API key (Postman: `merchant_api_key`)
- `XPAYSAFE_API_SECRET` – Decrypted API secret (Postman: `merchant_api_secret`)
- `XPAYSAFE_SALT` – Merchant salt (Postman: `merchant_salt`)
- `XPAYSAFE_BASE_URL` – Optional; default `https://api.xpaysafe.com`. For local xpaysafe use `http://localhost:3000`

## 2. Database migration

Run the pending payments table migration (one-time):

```bash
psql "$DATABASE_URL" -f scripts/add-pending-payments-table.sql
```

Or run the SQL in `scripts/add-pending-payments-table.sql` in your DB client.

## 3. Webhook URL

In the xpaysafe merchant dashboard, set your **Webhook / Callback URL** to:

```
https://<your-domain>/api/webhooks/xpaysafe
```

For local testing use a tunnel (e.g. ngrok):

1. Start your app: `npm run dev` (runs on port 3001).
2. In another terminal: `ngrok http 3001`.
3. Copy the HTTPS URL (e.g. `https://xxxx.ngrok-free.app`) and set the webhook to:

   ```
   https://<your-ngrok-host>/api/webhooks/xpaysafe
   ```

Webhook verification uses the same HMAC-SHA256 logic as API requests (`X-Signature` with `API_SECRET + SALT`).

## 4. Flow

1. User clicks **Buy Now** on a painting → frontend calls `POST /api/payments/initiate` with painting details.
2. Backend creates a `pending_payments` row and calls xpaysafe **Payin** API; returns `redirectUrl`.
3. User is redirected to `redirectUrl` (xpaysafe gateway) to pay.
4. xpaysafe sends a **POST** to `/api/webhooks/xpaysafe` with status (e.g. `SUCCESS`).
5. On `SUCCESS`, the webhook creates the sale, credits the user’s wallet (free wagering points), sends the invoice email, and marks the pending payment complete.

## 5. Troubleshooting

### "No suitable gateway found for this transaction amount/type"

This comes from xpaysafe when their backend cannot route your transaction. Common causes:

| Cause | What to do |
|-------|------------|
| **No gateway linked** | In xpaysafe dashboard, link and enable at least one payment gateway (e.g. UPI, cards) for **Payin**. |
| **Amount limits** | Gateway may have min/max (e.g. min ₹500, max ₹50,000). Try an amount within their supported range. |
| **Currency** | Ensure **INR** is enabled for your account and for the gateway. |
| **Account / KYC** | Some gateways require completed merchant KYC or approval. |

Contact xpaysafe support with your merchant ID and this message; they can confirm gateway status and allowed amount/currency for your account.

### "Validation errors"

xpaysafe returns this when the payin payload fails their validation. The app now surfaces any `errors` / `details` they send (e.g. in the UI or server logs).

Common causes:

| Field | Requirement |
|-------|-------------|
| **phone** | 10-digit Indian mobile; placeholder `9999999999` is used if you don’t collect phone. |
| **email** | Non-empty, valid format; we use the logged-in user’s email or a fallback. |
| **name** | Non-empty; we use display name or `"Customer"`. |
| **amount** | Number, max 2 decimals; within gateway min/max. |
| **orderId** | Unique per transaction; we generate e.g. `ORD_xxx`. |

In development, the full xpaysafe error body is logged to the server console (`[xpaysafe] payin error response:`). Use that to see which field failed.

### `relation "pending_payments" does not exist` (500 on `/api/payments/initiate`)

The database is missing the `pending_payments` table. On **Render**, the `render.yaml` release command runs `npm run db:migrate-pending-payments` on each deploy, which creates the table. Redeploy the service so the migration runs. If you deploy without `render.yaml`, run the migration once manually:

```bash
DATABASE_URL="your-render-database-url" node scripts/run-add-pending-payments-table.js
```

Or run `scripts/add-pending-payments-table.sql` in your DB client (e.g. Render Postgres shell).

### Cross-Origin-Opener-Policy (COOP) console warnings

If you see "Cross-Origin-Opener-Policy policy would block the window.closed call" in the browser console, it usually comes from the **payment gateway’s page** (after redirect) or a script there, not from this app. This app uses a full-page redirect (`window.location.href`) to the payment URL, not a popup. The warnings are often harmless and do not stop the payment from completing.

---

## 6. Optional: payment success page

If the gateway redirects the user back to your site after payment, you can send them to `/merchandise/success` (or any URL you configure with xpaysafe). That page can show “Payment received; your wallet will be updated shortly” and a link to the wallet.
