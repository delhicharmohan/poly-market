# Environment Variables Setup

## Required Environment Variables

The API key is now managed server-side via environment variables. You need to configure the following:

### 1. Create `.env.local` file

Create a `.env.local` file in the root of your project with the following variables:

```env
# API Configuration
MERCHANT_API_KEY=your_merchant_api_key_here
API_BASE_URL=http://localhost:3001/v1

# Database Configuration
DATABASE_URL=postgresql://indimarket:indimarket123@localhost:5434/indimarket
POSTGRES_PORT=5434
```

### 2. Set Your Merchant API Key

Replace `your_merchant_api_key_here` with your actual merchant API key from the provider.

### 3. Restart the Server

After updating `.env.local`, restart your Next.js development server:

```bash
npm run dev
```

## Security Notes

- **Never commit `.env.local` to version control** - it's already in `.gitignore`
- The API key is now only accessible server-side, not exposed to the client
- All API requests are made through Next.js API routes which use the server-side API key
- The webhook endpoint uses the same API key for signature verification

## Client-Side Configuration

Users can still configure the API endpoint URL in the settings page (`/config`), but the API key is managed entirely server-side.

## Verification

To verify the API key is configured correctly:

1. Check that markets load on the home page
2. If you see an error about "API key not configured", check your `.env.local` file
3. Make sure you've restarted the server after adding the environment variable
