-- Pending payments (xpaysafe payin) – completed when webhook reports SUCCESS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS pending_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    painting_id VARCHAR(100) NOT NULL,
    painting_name VARCHAR(255) NOT NULL,
    painting_image_url TEXT,
    amount_inr DECIMAL(20, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    gateway_transaction_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_pending_payments_order_id ON pending_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_user_id ON pending_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON pending_payments(status);
