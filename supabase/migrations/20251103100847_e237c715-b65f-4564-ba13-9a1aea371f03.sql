-- Allow public access to trades from public portfolios
CREATE POLICY "Public portfolio trades are viewable"
ON public.trades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.user_id = trades.user_id
    AND portfolios.is_public = true
  )
);

-- Drop the old policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Public portfolio trades are viewable" ON public.trades;