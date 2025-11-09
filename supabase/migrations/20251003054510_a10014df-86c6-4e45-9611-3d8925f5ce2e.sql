-- Add drawdown_type column to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS drawdown_type TEXT DEFAULT 'static' CHECK (drawdown_type IN ('static', 'trailing'));