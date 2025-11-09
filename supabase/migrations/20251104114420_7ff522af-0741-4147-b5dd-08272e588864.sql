-- Add account_id to portfolios table to link portfolio to specific account
ALTER TABLE public.portfolios ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Create junction table for selected trades in portfolio
CREATE TABLE public.portfolio_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(portfolio_id, trade_id)
);

-- Enable RLS on portfolio_trades
ALTER TABLE public.portfolio_trades ENABLE ROW LEVEL SECURITY;

-- RLS policies for portfolio_trades
CREATE POLICY "Users can manage their portfolio trades"
ON public.portfolio_trades
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE portfolios.id = portfolio_trades.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Public portfolio trades are viewable"
ON public.portfolio_trades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE portfolios.id = portfolio_trades.portfolio_id
    AND portfolios.is_public = true
  )
);