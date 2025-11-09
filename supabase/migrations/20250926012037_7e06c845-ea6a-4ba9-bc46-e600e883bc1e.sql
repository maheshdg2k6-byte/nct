-- Add commission column to trades table
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;