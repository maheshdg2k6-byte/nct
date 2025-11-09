interface Trade {
  id: string;
  symbol: string;
  entry_price: number;
  exit_price?: number;
  side: 'Long' | 'Short';
  created_at: string;
  pnl?: number;
}

interface TradingViewChartProps {
  symbol: string;
  trades: Trade[];
  className?: string;
}

export function TradingViewChart({ symbol, trades, className = '' }: TradingViewChartProps) {
  const symbolTrades = trades.filter(t => t.symbol === symbol);

  return (
    <div className={`p-4 ${className}`}>
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">{symbol} Trade History</h3>
        <p className="text-sm text-muted-foreground">Entry and Exit Points</p>
      </div>
      
      {symbolTrades.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No trades found for {symbol}
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {symbolTrades.map(trade => (
            <div key={trade.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${trade.side === 'Long' ? 'bg-success' : 'bg-destructive'}`} />
                <div>
                  <div className="font-medium">
                    {trade.side} @ {trade.entry_price.toFixed(5)}
                  </div>
                  {trade.exit_price && (
                    <div className="text-sm text-muted-foreground">
                      Exit @ {trade.exit_price.toFixed(5)}
                    </div>
                  )}
                </div>
              </div>
              {trade.pnl !== null && trade.pnl !== undefined && (
                <div className={`font-bold ${trade.pnl > 0 ? 'text-success' : 'text-destructive'}`}>
                  {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
