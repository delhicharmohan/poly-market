-- Run this if your DB already exists and you need to add the sales table only
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
