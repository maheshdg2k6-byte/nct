import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

interface ExpectedValueChartProps {
  trades: any[];
}

export const ExpectedValueChart = React.memo(({ trades }: ExpectedValueChartProps) => {
  const data = React.useMemo(() => {
    const completedTrades = trades.filter(t => t.pnl !== null);
    const winningTrades = completedTrades.filter(t => Number(t.pnl) > 0);
    const losingTrades = completedTrades.filter(t => Number(t.pnl) < 0);
    
    const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) : 0;
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + Number(t.pnl), 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + Number(t.pnl), 0) / losingTrades.length)
      : 0;
    
    const expectedValue = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    return [
      { name: 'Avg Win', value: Number(avgWin.toFixed(2)), color: 'hsl(var(--success))' },
      { name: 'Avg Loss', value: Number(avgLoss.toFixed(2)), color: 'hsl(var(--destructive))' },
      { name: 'Expected Value', value: Number(expectedValue.toFixed(2)), color: expectedValue >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }
    ];
  }, [trades]);

  const chartConfig = {
    value: {
      label: "Value ($)",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expected Value Analysis</CardTitle>
        <CardDescription>
          Average outcomes and statistical edge
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name"
                className="text-xs"
              />
              <YAxis 
                label={{ value: 'Value ($)', angle: -90, position: 'insideLeft' }}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
});

ExpectedValueChart.displayName = 'ExpectedValueChart';
