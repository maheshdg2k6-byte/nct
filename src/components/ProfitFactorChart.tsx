import { memo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAccount } from "@/contexts/AccountContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ProfitFactorChart = memo(({ className }: { className?: string }) => {
  const { selectedAccount } = useAccount();
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedAccount || !user) return;

      try {
        const { data: trades, error } = await supabase
          .from('trades')
          .select('pnl, created_at')
          .eq('user_id', user.id)
          .eq('account_id', selectedAccount.id)
          .not('pnl', 'is', null)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by month
        const monthlyData: any = {};
        trades?.forEach(trade => {
          const month = new Date(trade.created_at).toLocaleDateString('en', { month: 'short', year: '2-digit' });
          if (!monthlyData[month]) {
            monthlyData[month] = { month, grossProfit: 0, grossLoss: 0 };
          }
          const pnl = Number(trade.pnl);
          if (pnl > 0) {
            monthlyData[month].grossProfit += pnl;
          } else {
            monthlyData[month].grossLoss += Math.abs(pnl);
          }
        });

        const chartData = Object.values(monthlyData).map((item: any) => ({
          ...item,
          profitFactor: item.grossLoss > 0 ? (item.grossProfit / item.grossLoss).toFixed(2) : item.grossProfit > 0 ? '∞' : '0'
        }));

        setData(chartData);
      } catch (error) {
        console.error('Error loading profit factor data:', error);
      }
    };

    loadData();
  }, [selectedAccount, user]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Profit Factor</CardTitle>
        <CardDescription>Gross profit ÷ Gross loss by month</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Bar dataKey="grossProfit" fill="hsl(var(--success))" name="Gross Profit" />
            <Bar dataKey="grossLoss" fill="hsl(var(--destructive))" name="Gross Loss" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

ProfitFactorChart.displayName = "ProfitFactorChart";

export { ProfitFactorChart };