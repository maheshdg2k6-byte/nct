import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/contexts/AccountContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, memo } from "react";

interface WinLossPieChartProps {
  className?: string;
}

export const WinLossPieChart = memo(({ className }: WinLossPieChartProps) => {
  const { user } = useAuth();
  const { selectedAccount } = useAccount();
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([]);
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
        .select('pnl')
        .eq('user_id', user.id)
        .eq('account_id', selectedAccount.id)
        .not('pnl', 'is', null);

      if (error) throw error;

      const wins = trades?.filter(t => Number(t.pnl) > 0).length || 0;
      const losses = trades?.filter(t => Number(t.pnl) < 0).length || 0;
      const breakeven = trades?.filter(t => Number(t.pnl) === 0).length || 0;

      setData([
        { name: 'Wins', value: wins, color: 'hsl(var(--success))' },
        { name: 'Losses', value: losses, color: 'hsl(var(--destructive))' },
        { name: 'Breakeven', value: breakeven, color: 'hsl(var(--muted-foreground))' }
      ].filter(item => item.value > 0));
    } catch (error) {
      console.error('Error loading win/loss data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>;
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground">No trade data</div>;

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
});

WinLossPieChart.displayName = 'WinLossPieChart';
