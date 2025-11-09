-- Enable realtime for trades table
ALTER TABLE public.trades REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- Enable realtime for accounts table  
ALTER TABLE public.accounts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;

-- Enable realtime for playbooks table
ALTER TABLE public.playbooks REPLICA IDENTITY FULL;  
ALTER PUBLICATION supabase_realtime ADD TABLE public.playbooks;