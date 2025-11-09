import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/contexts/AccountContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, memo } from "react";
import { format } from 'date-fns';

interface DailyPnLChartProps {
  className?: string;
}

export const DailyPnLChart = memo(({ className }: DailyPnLChartProps) => {
  const { user } = useAuth();
  const { selectedAccount } = useAccount();
  const [data, setData] = useState<{ date: string; pnl: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user, selectedAccount]);

  const loadData = async () => {
    if (!user || !selectedAccount) return;

    try {
      setLoading(true);
      const { data: trades, error } = await supabase
        .from('trades')
        .select('pnl, created_at')
        .eq('user_id', user.id)
        .eq('account_id', selectedAccount.id)
        .not('pnl', 'is', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const dailyPnL: Record<string, number> = {};
      trades?.forEach(trade => {
        const date = format(new Date(trade.created_at), 'MMM dd');
        dailyPnL[date] = (dailyPnL[date] || 0) + Number(trade.pnl);
      });

      const chartData = Object.entries(dailyPnL)
        .map(([date, pnl]) => ({ date, pnl }))
        .slice(-30); // Last 30 days

      setData(chartData);
    } catch (error) {
      console.error('Error loading daily PnL:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>;
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground">No trade data</div>;

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" />
        <Bar 
          dataKey="pnl" 
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

DailyPnLChart.displayName = 'DailyPnLChart';
