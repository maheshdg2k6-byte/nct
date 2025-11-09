import { memo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAccount } from "@/contexts/AccountContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AverageRRChart = memo(({ className }: { className?: string }) => {
  const { selectedAccount } = useAccount();
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedAccount || !user) return;

      try {
        const { data: trades, error } = await supabase
          .from('trades')
          .select('actual_r2r, initial_r2r, created_at')
          .eq('user_id', user.id)
          .eq('account_id', selectedAccount.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by week
        const weeklyData: any = {};
        trades?.forEach(trade => {
          const week = new Date(trade.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
          if (!weeklyData[week]) {
            weeklyData[week] = { week, actualSum: 0, initialSum: 0, count: 0 };
          }
          if (trade.actual_r2r) {
            weeklyData[week].actualSum += Number(trade.actual_r2r);
            weeklyData[week].count++;
          }
          if (trade.initial_r2r) {
            weeklyData[week].initialSum += Number(trade.initial_r2r);
          }
        });

        const chartData = Object.values(weeklyData).map((item: any) => ({
          week: item.week,
          avgActual: item.count > 0 ? (item.actualSum / item.count).toFixed(2) : 0,
          avgInitial: item.count > 0 ? (item.initialSum / item.count).toFixed(2) : 0
        }));

        setData(chartData);
      } catch (error) {
        console.error('Error loading RR data:', error);
      }
    };

    loadData();
  }, [selectedAccount, user]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Average Risk:Reward Ratio</CardTitle>
        <CardDescription>Initial vs actual R:R over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="week" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Line
              type="monotone"
              dataKey="avgInitial"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Initial R:R"
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line
              type="monotone"
              dataKey="avgActual"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              name="Actual R:R"
              dot={{ fill: 'hsl(var(--success))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

AverageRRChart.displayName = "AverageRRChart";

export { AverageRRChart };