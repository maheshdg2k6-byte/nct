-- Add columns for prop firm account features
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS daily_drawdown NUMERIC DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS max_drawdown NUMERIC DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS profit_target NUMERIC DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS phase INTEGER DEFAULT 1;