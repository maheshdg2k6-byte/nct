-- Create accounts table for persistent account storage
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Live', 'Demo', 'Backtesting')),
  broker TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  starting_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  total_pnl NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own accounts" 
ON public.accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" 
ON public.accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" 
ON public.accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update account stats based on trades
CREATE OR REPLACE FUNCTION public.update_account_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update account stats when trades are inserted, updated, or deleted
  UPDATE public.accounts 
  SET 
    total_trades = (
      SELECT COUNT(*) 
      FROM public.trades 
      WHERE account_id = COALESCE(NEW.account_id, OLD.account_id)::text
      AND user_id = COALESCE(NEW.user_id, OLD.user_id)
    ),
    total_pnl = COALESCE((
      SELECT SUM(pnl) 
      FROM public.trades 
      WHERE account_id = COALESCE(NEW.account_id, OLD.account_id)::text
      AND user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND pnl IS NOT NULL
    ), 0),
    win_rate = COALESCE((
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE pnl > 0) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 1
      )
      FROM public.trades 
      WHERE account_id = COALESCE(NEW.account_id, OLD.account_id)::text
      AND user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND pnl IS NOT NULL
    ), 0),
    current_balance = starting_balance + COALESCE((
      SELECT SUM(pnl) 
      FROM public.trades 
      WHERE account_id = COALESCE(NEW.account_id, OLD.account_id)::text
      AND user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND pnl IS NOT NULL
    ), 0)
  WHERE id = COALESCE(NEW.account_id, OLD.account_id)::uuid
  AND user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update account stats when trades change
CREATE TRIGGER trigger_update_account_stats_insert
AFTER INSERT ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.update_account_stats();

CREATE TRIGGER trigger_update_account_stats_update
AFTER UPDATE ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.update_account_stats();

CREATE TRIGGER trigger_update_account_stats_delete
AFTER DELETE ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.update_account_stats();