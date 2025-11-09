-- Drop the old check constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;

-- Add updated check constraint with correct account types
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check 
CHECK (type IN ('Live', 'Demo', 'Backtesting', 'Prop Firm Challenge', 'Prop Funded/Live'));