-- Create necessary tables for NCTJournal
-- 1) Helper function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2) Playbooks table
CREATE TABLE IF NOT EXISTS public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Playbooks are selectable by owner"
  ON public.playbooks FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Playbooks are insertable by owner"
  ON public.playbooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Playbooks are updatable by owner"
  ON public.playbooks FOR UPDATE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Playbooks are deletable by owner"
  ON public.playbooks FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER trg_playbooks_updated_at
BEFORE UPDATE ON public.playbooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Strategies table (optional, referenced by playbooks)
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Strategies are selectable by owner"
  ON public.strategies FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Strategies are insertable by owner"
  ON public.strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Strategies are updatable by owner"
  ON public.strategies FOR UPDATE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Strategies are deletable by owner"
  ON public.strategies FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER trg_strategies_updated_at
BEFORE UPDATE ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT CHECK (side IN ('Long','Short')) NOT NULL,
  entry_price NUMERIC,
  exit_price NUMERIC,
  size NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  notes TEXT,
  playbook_id UUID REFERENCES public.playbooks(id) ON DELETE SET NULL,
  pnl NUMERIC,
  tags JSONB,
  trade_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Trades are selectable by owner"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Trades are insertable by owner"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Trades are updatable by owner"
  ON public.trades FOR UPDATE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Trades are deletable by owner"
  ON public.trades FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account ON public.trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON public.trades(trade_date);

CREATE TRIGGER trg_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime support
ALTER TABLE public.trades REPLICA IDENTITY FULL;
ALTER TABLE public.playbooks REPLICA IDENTITY FULL;
ALTER TABLE public.strategies REPLICA IDENTITY FULL;

