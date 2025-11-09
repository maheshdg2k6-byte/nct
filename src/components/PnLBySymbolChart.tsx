import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState, memo } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PnLBySymbolChartProps {
  className?: string;
}

export const PnLBySymbolChart = memo(({ className }: PnLBySymbolChartProps) => {
  const { selectedAccount } = useAccount();
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPnLData = async () => {
      if (!user || !selectedAccount) {
        setData([]);
        setLoading(false);
        return;
      }

      try {
        const { data: trades, error } = await supabase
          .from('trades')
          .select('symbol, pnl')
          .eq('user_id', user.id)
          .eq('account_id', selectedAccount.id)
          .not('pnl', 'is', null);

        if (error) throw error;

        // Group trades by symbol and calculate total P&L
        const symbolData: { [key: string]: { pnl: number; trades: number } } = {};
        
        trades?.forEach((trade) => {
          if (!symbolData[trade.symbol]) {
            symbolData[trade.symbol] = { pnl: 0, trades: 0 };
          }
          symbolData[trade.symbol].pnl += trade.pnl;
          symbolData[trade.symbol].trades += 1;
        });

        // Convert to array format for chart
        const chartData = Object.entries(symbolData)
          .map(([symbol, data]) => ({
            symbol,
            pnl: data.pnl,
            trades: data.trades
          }))
          .sort((a, b) => b.pnl - a.pnl); // Sort by P&L descending

        setData(chartData);
      } catch (error) {
        console.error('Error loading P&L by symbol data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    loadPnLData();
  }, [user, selectedAccount]);

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'INR': return '₹';
      default: return '$';
    }
  };

  const currencySymbol = getCurrencySymbol(selectedAccount?.currency || 'USD');

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-80 ${className}`}>
        <div className="text-muted-foreground">Loading P&L data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-80 ${className}`}>
        <div className="text-center text-muted-foreground">
          <p>No trade data available</p>
          <p className="text-sm mt-1">Add some trades to see P&L by symbol</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="symbol"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            tickFormatter={(value) => `${currencySymbol}${value.toLocaleString()}`}
          />
          <Tooltip 
            formatter={(value: any, name) => [
              `${currencySymbol}${Number(value).toLocaleString()}`, 
              'P&L'
            ]}
            labelFormatter={(label) => `Symbol: ${label}`}
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--popover-foreground))'
            }}
          />
          <Bar 
            dataKey="pnl" 
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

PnLBySymbolChart.displayName = 'PnLBySymbolChart';