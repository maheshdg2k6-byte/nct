-- Add columns for trailing drawdown tracking
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS peak_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS daily_drawdown_limit DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS max_drawdown_limit DECIMAL(15,2);

-- Set initial peak_balance to current_balance for existing accounts
UPDATE accounts 
SET peak_balance = current_balance 
WHERE peak_balance IS NULL;