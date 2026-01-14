# Database Setup and Integration Guide

This document explains how the PostgreSQL database integration works in the Indimarket application.

## Overview

The application uses PostgreSQL for persistent data storage, with localStorage as a fallback mechanism. This ensures data persistence across sessions and devices.

## Architecture

### Data Flow

1. **Client-Side** → Makes API requests to Next.js API routes
2. **API Routes** → Connect to PostgreSQL database
3. **Database** → Stores all persistent data
4. **Fallback** → If database is unavailable, uses localStorage

### Components

- `lib/db.ts` - Database connection pool (server-side)
- `lib/db-client.ts` - Client-side API utilities
- `lib/transactions.ts` - Transaction management (with DB integration)
- `lib/wallet.ts` - Wallet management (with DB integration)
- `app/api/*` - API routes for database operations

## Setup Steps

### 1. Start PostgreSQL

```bash
npm run db:up
# or
docker-compose up -d postgres
```

### 2. Initialize Database Schema

```bash
./scripts/setup-db.sh
# or manually:
docker cp init-db.sql indimarket-postgres:/tmp/init-db.sql
docker-compose exec postgres psql -U indimarket -d indimarket -f /tmp/init-db.sql
```

### 3. Configure Environment Variables

Create `.env.local` with:

```env
DATABASE_URL=postgresql://indimarket:indimarket123@localhost:5432/indimarket
POSTGRES_USER=indimarket
POSTGRES_PASSWORD=indimarket123
POSTGRES_DB=indimarket
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

### 4. Install Dependencies

```bash
npm install
```

## Database Schema

### Users Table
- Stores Firebase user information
- Links Firebase UID to database user ID
- Automatically synced on login

### Markets Table
- Stores market information
- Updated when wagers are placed

### Wagers Table
- All placed bets/transactions
- Links to users and markets
- Includes odds, stake, potential winnings

### Wallet Transactions Table
- All wallet operations (deposits, withdrawals, wagers)
- Used to calculate current balance
- Provides transaction history

## API Endpoints

### Transactions

**GET /api/transactions**
- Fetches all transactions for the authenticated user
- Returns: Array of transaction objects

**POST /api/transactions**
- Saves a new transaction to the database
- Body: `{ wagerId, marketId, marketTitle, selection, stake, odds, potentialWin, status, marketStatus, email }`
- Returns: `{ success: true, id: transactionId }`

### Wallet

**GET /api/wallet**
- Gets current wallet balance
- Calculated from wallet_transactions table
- Returns: `{ balance: number }`

**POST /api/wallet**
- Deposits or withdraws funds
- Body: `{ type: "deposit" | "withdraw", amount: number, description?: string }`
- Returns: `{ success: true, balance: number, transaction: {...} }`

### Users

**POST /api/users/sync**
- Syncs Firebase user to database
- Body: `{ firebaseUid: string, email: string, displayName?: string }`
- Returns: `{ success: true, user: {...} }`

## Usage in Code

### Saving a Transaction

```typescript
import { transactions } from "@/lib/transactions";

await transactions.addTransaction(wagerResult, market, userEmail);
```

### Getting Transactions

```typescript
import { transactions } from "@/lib/transactions";

const allTransactions = await transactions.getAllTransactions();
```

### Wallet Operations

```typescript
import { wallet } from "@/lib/wallet";

// Get balance
const balance = await wallet.getBalance();

// Deposit
await wallet.deposit(100);

// Withdraw
await wallet.withdraw(50);

// Check if can withdraw
const canWithdraw = await wallet.canWithdraw(amount);
```

## Migration from localStorage

The system automatically:
1. Tries to save to database first
2. Falls back to localStorage if database fails
3. Merges data from both sources when reading

To migrate existing localStorage data:
1. Ensure database is running
2. User logs in (triggers user sync)
3. Transactions and wallet data will be saved to database on next operation

## Troubleshooting

### Database Connection Issues

1. Check if PostgreSQL is running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   npm run db:logs
   ```

3. Test connection:
   ```bash
   npm run db:shell
   ```

### Data Not Persisting

1. Check environment variables are set correctly
2. Verify database schema is initialized
3. Check API route logs for errors
4. Ensure user is authenticated (Firebase UID in session)

### Performance

- Database connection pooling is configured (max 20 connections)
- Indexes are created on frequently queried columns
- Transactions are fetched with LIMIT to prevent large queries

## Backup and Restore

### Backup

```bash
npm run db:backup
# or
docker-compose exec postgres pg_dump -U indimarket indimarket > backup.sql
```

### Restore

```bash
docker-compose exec -T postgres psql -U indimarket indimarket < backup.sql
```

## Production Considerations

1. **Environment Variables**: Use secure secrets management
2. **Connection Pooling**: Adjust pool size based on load
3. **Backups**: Set up automated backups
4. **Monitoring**: Monitor database performance and connections
5. **SSL**: Enable SSL for database connections in production
6. **Firewall**: Restrict database access to application servers only


