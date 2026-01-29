-- Initialize Indimarket Database Schema
-- This file can be used to set up initial database structure

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (if you want to sync with Firebase users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Markets table
CREATE TABLE IF NOT EXISTS markets (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('OPEN', 'CLOSED', 'SETTLED')),
    category VARCHAR(100),
    term VARCHAR(100),
    pool_yes DECIMAL(20, 2) DEFAULT 0,
    pool_no DECIMAL(20, 2) DEFAULT 0,
    total_pool DECIMAL(20, 2) DEFAULT 0,
    closure_timestamp BIGINT,
    resolution_timestamp BIGINT,
    source_of_truth TEXT,
    confidence_score DECIMAL(5, 2),
    odds_yes DECIMAL(10, 4),
    odds_no DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wagers/Transactions table
CREATE TABLE IF NOT EXISTS wagers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wager_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    market_id VARCHAR(255) REFERENCES markets(id) ON DELETE CASCADE,
    selection VARCHAR(10) NOT NULL CHECK (selection IN ('yes', 'no')),
    stake DECIMAL(20, 2) NOT NULL,
    odds_yes DECIMAL(10, 4) NOT NULL,
    odds_no DECIMAL(10, 4) NOT NULL,
    potential_win DECIMAL(20, 2) NOT NULL,
    actual_payout DECIMAL(20, 2) DEFAULT NULL,
    status VARCHAR(50) NOT NULL,
    market_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'wager', 'win')),
    amount DECIMAL(20, 2) NOT NULL,
    balance_after DECIMAL(20, 2) NOT NULL,
    description TEXT,
    wager_id UUID REFERENCES wagers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sales (merchandise / painting purchases) table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    painting_id VARCHAR(100) NOT NULL,
    painting_name VARCHAR(255) NOT NULL,
    painting_image_url TEXT,
    amount_inr DECIMAL(20, 2) NOT NULL,
    wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_wagers_user_id ON wagers(user_id);
CREATE INDEX IF NOT EXISTS idx_wagers_market_id ON wagers(market_id);
CREATE INDEX IF NOT EXISTS idx_wagers_created_at ON wagers(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_markets_updated_at ON markets;
CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wagers_updated_at ON wagers;
CREATE TRIGGER update_wagers_updated_at BEFORE UPDATE ON wagers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

