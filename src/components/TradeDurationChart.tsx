import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface TradeDurationChartProps {
  trades: any[];
}

export const TradeDurationChart = React.memo(({ trades }: TradeDurationChartProps) => {
  const data = React.useMemo(() => {
    const durationCategories = {
      '< 1 hour': 0,
      '1-4 hours': 0,
      '4-24 hours': 0,
      '1-3 days': 0,
      '3-7 days': 0,
      '> 7 days': 0
    };

    trades
      .filter(t => t.created_at && t.updated_at)
      .forEach(trade => {
        const start = new Date(trade.created_at).getTime();
        const end = new Date(trade.updated_at).getTime();
        const durationHours = (end - start) / (1000 * 60 * 60);

        if (durationHours < 1) durationCategories['< 1 hour']++;
        else if (durationHours < 4) durationCategories['1-4 hours']++;
        else if (durationHours < 24) durationCategories['4-24 hours']++;
        else if (durationHours < 72) durationCategories['1-3 days']++;
        else if (durationHours < 168) durationCategories['3-7 days']++;
        else durationCategories['> 7 days']++;
      });

    return Object.entries(durationCategories).map(([duration, count]) => ({
      duration,
      count
    }));
  }, [trades]);

  const chartConfig = {
    count: {
      label: "Number of Trades",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Duration Distribution</CardTitle>
        <CardDescription>
          How long you typically hold trades
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="duration"
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                label={{ value: 'Trade Count', angle: -90, position: 'insideLeft' }}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
});

TradeDurationChart.displayName = 'TradeDurationChart';
