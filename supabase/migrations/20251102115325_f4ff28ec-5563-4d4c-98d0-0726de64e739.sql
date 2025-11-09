-- Add R2R ratio fields to trades table
ALTER TABLE trades 
ADD COLUMN initial_r2r numeric,
ADD COLUMN actual_r2r numeric,
ADD COLUMN exit_type text;

-- Create portfolios table for shareable trading portfolios
CREATE TABLE portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  bio text,
  is_public boolean DEFAULT false,
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  share_trades boolean DEFAULT true,
  share_analytics boolean DEFAULT true,
  share_calendar boolean DEFAULT false,
  share_playbooks boolean DEFAULT false,
  max_shared_trades integer DEFAULT 10,
  focus_learnings boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create portfolio_symbols table for symbol-wise portfolio views
CREATE TABLE portfolio_symbols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  strategy_notes text,
  win_rate numeric,
  total_trades integer DEFAULT 0,
  total_pnl numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(portfolio_id, symbol)
);

-- Enable RLS
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_symbols ENABLE ROW LEVEL SECURITY;

-- Portfolios policies
CREATE POLICY "Users can view their own portfolios"
  ON portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
  ON portfolios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
  ON portfolios FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Public portfolios are viewable by everyone"
  ON portfolios FOR SELECT
  USING (is_public = true);

-- Portfolio symbols policies
CREATE POLICY "Users can view their portfolio symbols"
  ON portfolio_symbols FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM portfolios 
    WHERE portfolios.id = portfolio_symbols.portfolio_id 
    AND portfolios.user_id = auth.uid()
  ));

CREATE POLICY "Users can create portfolio symbols"
  ON portfolio_symbols FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM portfolios 
    WHERE portfolios.id = portfolio_symbols.portfolio_id 
    AND portfolios.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their portfolio symbols"
  ON portfolio_symbols FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM portfolios 
    WHERE portfolios.id = portfolio_symbols.portfolio_id 
    AND portfolios.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their portfolio symbols"
  ON portfolio_symbols FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM portfolios 
    WHERE portfolios.id = portfolio_symbols.portfolio_id 
    AND portfolios.user_id = auth.uid()
  ));

CREATE POLICY "Public portfolio symbols are viewable"
  ON portfolio_symbols FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM portfolios 
    WHERE portfolios.id = portfolio_symbols.portfolio_id 
    AND portfolios.is_public = true
  ));

-- Triggers for updated_at
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_symbols_updated_at
  BEFORE UPDATE ON portfolio_symbols
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();