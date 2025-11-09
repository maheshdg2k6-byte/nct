-- Add column to track manual deposits/withdrawals separately from trade PnL
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS manual_adjustments numeric DEFAULT 0;

COMMENT ON COLUMN accounts.manual_adjustments IS 'Total deposits and withdrawals made manually (not from trades)';
