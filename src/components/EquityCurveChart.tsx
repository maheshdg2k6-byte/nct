import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { memo } from 'react';
import { useEffect, useState } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface EquityCurveChartProps {
  className?: string;
}

export const EquityCurveChart = memo(({ className }: EquityCurveChartProps) => {
  const { selectedAccount } = useAccount();
  const { user } = useAuth();
  const [data, setData] = useState<Array<{
    date: string;
    balance: number;
    formattedDate: string;
    tradePnl?: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [drawdownLines, setDrawdownLines] = useState<{ 
    daily: number | null; 
    max: number | null;
  }>({ daily: null, max: null });

  useEffect(() => {
    const loadEquityData = async () => {
      if (!user || !selectedAccount) {
        setData([]);
        setLoading(false);
        return;
      }

      try {
        const { data: trades, error } = await supabase
          .from('trades')
          .select('pnl, created_at')
          .eq('user_id', user.id)
          .eq('account_id', selectedAccount.id)
          .not('pnl', 'is', null)
          .order('created_at', { ascending: true });

        if (error) throw error;

        let runningBalance = selectedAccount.startingBalance;
        const equityData: Array<{
          date: string;
          balance: number;
          formattedDate: string;
          tradePnl?: number;
        }> = [
          {
            date: 'Start',
            balance: runningBalance,
            formattedDate: 'Starting Balance'
          }
        ];

        trades?.forEach((trade, index) => {
          runningBalance += trade.pnl;
          equityData.push({
            date: new Date(trade.created_at).toLocaleDateString(),
            balance: runningBalance,
            formattedDate: new Date(trade.created_at).toLocaleDateString(),
            tradePnl: trade.pnl
          });
        });

        setData(equityData);

        // Calculate drawdown lines for prop firm accounts (percentage-based)
        const isPropFirmAccount = selectedAccount.type === 'Prop Firm Challenge' || 
                                  selectedAccount.type === 'Prop Funded/Live';
        
        if (isPropFirmAccount && selectedAccount.dailyDrawdown && selectedAccount.maxDrawdown) {
          const startingBalance = selectedAccount.startingBalance;
          const currentBalance = selectedAccount.currentBalance;
          
          if (selectedAccount.drawdownType === 'trailing') {
            // Trailing: based on highest balance reached (current balance for now)
            const dailyLimit = currentBalance - (currentBalance * (selectedAccount.dailyDrawdown / 100));
            const maxLimit = currentBalance - (currentBalance * (selectedAccount.maxDrawdown / 100));
            setDrawdownLines({ daily: dailyLimit, max: maxLimit });
          } else {
            // Static: based on starting balance
            const dailyLimit = startingBalance - (startingBalance * (selectedAccount.dailyDrawdown / 100));
            const maxLimit = startingBalance - (startingBalance * (selectedAccount.maxDrawdown / 100));
            setDrawdownLines({ daily: dailyLimit, max: maxLimit });
          }
        } else {
          setDrawdownLines({ daily: null, max: null });
        }
      } catch (error) {
        console.error('Error loading equity curve data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    loadEquityData();
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
        <div className="text-muted-foreground">Loading equity curve...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-80 ${className}`}>
        <div className="text-center text-muted-foreground">
          <p>No trade data available</p>
          <p className="text-sm mt-1">Add some trades to see your equity curve</p>
        </div>
      </div>
    );
  }

  const isPropFirmAccount = selectedAccount && (
    selectedAccount.type === 'Prop Firm Challenge' || 
    selectedAccount.type === 'Prop Funded/Live'
  );

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            tickFormatter={(value) => `${currencySymbol}${value.toLocaleString()}`}
          />
          <Tooltip 
            formatter={(value: any, name: string) => {
              if (name === 'balance') return [`${currencySymbol}${Number(value).toLocaleString()}`, 'Balance'];
              return [value, name];
            }}
            labelFormatter={(label) => `Date: ${label}`}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              
              const data = payload[0].payload;
              const balance = data.balance;
              
              return (
                <div style={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'hsl(var(--popover-foreground))'
                }}>
                  <p style={{ marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                    Date: {data.formattedDate}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: 'hsl(var(--primary))' }}>
                    Balance: {currencySymbol}{Number(balance).toLocaleString()}
                  </p>
                  {drawdownLines.daily !== null && (
                    <p style={{ fontSize: '12px', color: 'hsl(var(--warning))', marginTop: '4px' }}>
                      Daily DD: {currencySymbol}{drawdownLines.daily.toLocaleString()}
                    </p>
                  )}
                  {drawdownLines.max !== null && (
                    <p style={{ fontSize: '12px', color: 'hsl(var(--destructive))' }}>
                      Max DD: {currencySymbol}{drawdownLines.max.toLocaleString()}
                    </p>
                  )}
                </div>
              );
            }}
          />
          {/* Main equity curve */}
          <Line 
            type="monotone" 
            dataKey="balance" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
          />
          {/* Daily drawdown line - only for prop firm accounts */}
          {drawdownLines.daily !== null && (
            <ReferenceLine 
              y={drawdownLines.daily} 
              stroke="hsl(var(--warning))" 
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
          {/* Max drawdown line - only for prop firm accounts */}
          {drawdownLines.max !== null && (
            <ReferenceLine 
              y={drawdownLines.max} 
              stroke="hsl(var(--destructive))" 
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

EquityCurveChart.displayName = 'EquityCurveChart';