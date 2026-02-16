-- Pending payouts (xpaysafe payout/withdrawal) – tracks async payout status
-- Refund wallet if webhook reports FAILED/EXPIRED
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS pending_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_inr DECIMAL(20, 2) NOT NULL,
    beneficiary_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc VARCHAR(20) NOT NULL,
    gateway_transaction_id VARCHAR(255),
    wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_pending_payouts_order_id ON pending_payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_pending_payouts_user_id ON pending_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_payouts_status ON pending_payouts(status);
