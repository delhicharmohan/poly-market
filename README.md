# Indimarket Prediction Network - Frontend

A modern frontend application for the Indimarket Prediction Network merchant platform.

## Features

- 🔐 **Secure Authentication**: HMAC-SHA256 signature-based API authentication
- 📊 **Market Listing**: View all active prediction markets with real-time pool data
- 💰 **Wager Placement**: Place bets on market outcomes with calculated odds
- ⚙️ **API Key Management**: Secure local storage of API credentials
- 🎨 **Modern UI**: Beautiful, responsive design with dark mode support

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Docker and Docker Compose (for PostgreSQL database)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database using Docker:

**Option A: Automated Setup (Recommended)**
```bash
# Run the setup script
./scripts/setup-db.sh
```

**Option B: Manual Setup**
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait for database to be ready (check logs)
docker-compose logs -f postgres

# Initialize database schema
docker cp init-db.sql indimarket-postgres:/tmp/init-db.sql
docker-compose exec postgres psql -U indimarket -d indimarket -f /tmp/init-db.sql
```

**Or use npm scripts:**
```bash
npm run db:up        # Start database
npm run db:init      # Initialize schema (after copying init-db.sql)
npm run db:shell     # Access PostgreSQL CLI
```

3. Set up environment variables:
Create a `.env.local` file (copy from `.env.example`):
```bash
# PostgreSQL Database Configuration
POSTGRES_USER=indimarket
POSTGRES_PASSWORD=indimarket123
POSTGRES_DB=indimarket
POSTGRES_PORT=5432
POSTGRES_HOST=localhost

# Database Connection String
DATABASE_URL=postgresql://indimarket:indimarket123@localhost:5432/indimarket

# Firebase Configuration (add your Firebase credentials)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Database Management

**Start PostgreSQL:**
```bash
docker-compose up -d postgres
```

**Stop PostgreSQL:**
```bash
docker-compose stop postgres
```

**View PostgreSQL logs:**
```bash
docker-compose logs -f postgres
```

**Access PostgreSQL CLI:**
```bash
docker-compose exec postgres psql -U indimarket -d indimarket
```

**Backup database:**
```bash
docker-compose exec postgres pg_dump -U indimarket indimarket > backup.sql
```

**Restore database:**
```bash
docker-compose exec -T postgres psql -U indimarket indimarket < backup.sql
```

**Remove database (WARNING: This deletes all data):**
```bash
docker-compose down -v
```

### Building for Production

```bash
npm run build
npm start
```

## Usage

1. **Configure API Key**: Click the "Settings" button in the header and enter your Indimarket API key
2. **Browse Markets**: View all available prediction markets with their current pool sizes and odds
3. **Place Wagers**: Click "Place Wager" on any open market to bet on an outcome
4. **Track Results**: View wager confirmations with odds and potential payouts

## API Integration

The frontend integrates with the Indimarket API following the merchant integration guide:

- **Authentication**: All requests include `X-Merchant-API-Key` header
- **Signatures**: POST requests include `X-Merchant-Signature` (HMAC-SHA256)
- **Endpoints**:
  - `GET /markets` - Fetch all markets
  - `POST /wager` - Place a wager

## Technology Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **PostgreSQL** - Database (via Docker)
- **Firebase** - Authentication
- **Lucide React** - Icons

## Database Integration

The application now uses PostgreSQL for data persistence:

- **Transactions**: All wagers/bets are stored in the database
- **Wallet**: Balance and transaction history are persisted
- **Users**: Firebase users are synced to the database
- **Fallback**: localStorage is used as a fallback if database is unavailable

### Database Schema

The database includes the following tables:
- `users` - User accounts synced from Firebase
- `markets` - Market information
- `wagers` - All placed bets/transactions
- `wallet_transactions` - Wallet deposit/withdrawal history

### API Routes

- `GET /api/transactions` - Fetch user transactions
- `POST /api/transactions` - Save a new transaction
- `GET /api/wallet` - Get wallet balance
- `POST /api/wallet` - Deposit or withdraw funds
- `POST /api/users/sync` - Sync Firebase user to database

## Security Notes

- API keys are stored in browser localStorage (client-side only)
- All API requests are made directly from the browser
- HMAC signatures are generated client-side using the Web Crypto API (Node.js crypto module in server-side context)
- Database connections use environment variables for credentials
- User authentication is handled via Firebase, with user IDs synced to PostgreSQL


