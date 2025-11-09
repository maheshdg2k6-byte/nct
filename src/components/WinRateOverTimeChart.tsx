import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/contexts/AccountContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, memo } from "react";
import { format } from 'date-fns';

interface WinRateOverTimeChartProps {
  className?: string;
}

export const WinRateOverTimeChart = memo(({ className }: WinRateOverTimeChartProps) => {
  const { user } = useAuth();
  const { selectedAccount } = useAccount();
  const [data, setData] = useState<{ date: string; winRate: number }[]>([]);
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

      // Calculate cumulative win rate over time
      let wins = 0;
      let total = 0;
      const chartData: { date: string; winRate: number }[] = [];

      trades?.forEach((trade, index) => {
        total++;
        if (Number(trade.pnl) > 0) wins++;
        
        // Only add data points every 5 trades to avoid clutter
        if (index % 5 === 0 || index === trades.length - 1) {
          chartData.push({
            date: format(new Date(trade.created_at), 'MMM dd'),
            winRate: (wins / total) * 100
          });
        }
      });

      setData(chartData);
    } catch (error) {
      console.error('Error loading win rate over time:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>;
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground">No trade data</div>;

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Win Rate']}
        />
        <Line 
          type="monotone" 
          dataKey="winRate" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

WinRateOverTimeChart.displayName = 'WinRateOverTimeChart';
