import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface DrawdownChartProps {
  trades: any[];
  startingBalance: number;
}

export const DrawdownChart = React.memo(({ trades, startingBalance }: DrawdownChartProps) => {
  const data = React.useMemo(() => {
    let runningBalance = startingBalance;
    let peak = startingBalance;
    
    const chartData = trades
      .filter(t => t.pnl !== null)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((trade, index) => {
        runningBalance += Number(trade.pnl) || 0;
        peak = Math.max(peak, runningBalance);
        const drawdown = ((runningBalance - peak) / peak) * 100;
        
        return {
          index: index + 1,
          drawdown: Number(drawdown.toFixed(2)),
          date: new Date(trade.created_at).toLocaleDateString()
        };
      });

    return chartData;
  }, [trades, startingBalance]);

  const chartConfig = {
    drawdown: {
      label: "Drawdown %",
      color: "hsl(var(--destructive))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Drawdown</CardTitle>
        <CardDescription>
          Percentage decline from peak balance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="index"
                label={{ value: 'Trade Number', position: 'insideBottom', offset: -5 }}
                className="text-xs"
              />
              <YAxis 
                label={{ value: 'Drawdown %', angle: -90, position: 'insideLeft' }}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="hsl(var(--destructive))"
                fill="url(#colorDrawdown)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
});

DrawdownChart.displayName = 'DrawdownChart';
