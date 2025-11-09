import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3, 
  Calendar,
  Target,
  DollarSign,
  Clock
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAccount } from "@/contexts/AccountContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { PnLBySymbolChart } from "@/components/PnLBySymbolChart";
import { WinLossPieChart } from "@/components/WinLossPieChart";
import { DailyPnLChart } from "@/components/DailyPnLChart";
import { WinRateOverTimeChart } from "@/components/WinRateOverTimeChart";
import { ProfitFactorChart } from "@/components/ProfitFactorChart";
import { AverageRRChart } from "@/components/AverageRRChart";
import { DrawdownChart } from "@/components/DrawdownChart";
import { ExpectedValueChart } from "@/components/ExpectedValueChart";
import { format } from "date-fns";

export default function Analytics() {
  const { selectedAccount } = useAccount();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [analytics, setAnalytics] = useState<any>({
    overview: {
      totalPnL: 0,
      winRate: 0,
      totalTrades: 0,
      avgRR: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      avgHoldTime: "0 hours"
    },
    bySymbol: [],
    byPlaybook: []
  });
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    if (user && selectedAccount) {
      loadAnalytics();
    }
  }, [user, selectedAccount, dateRange]);

  const loadAnalytics = async () => {
    if (!user || !selectedAccount) return;
    
    try {
      let query = supabase
        .from('trades')
        .select(`
          *,
          playbooks(name)
        `)
        .eq('user_id', user.id)
        .eq('account_id', selectedAccount.id.toString());

      // Apply date range filter if set
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data: tradesData, error } = await query;

      if (error) throw error;

      if (tradesData && tradesData.length > 0) {
        setTrades(tradesData);
        const calculatedAnalytics = calculateAnalytics(tradesData);
        setAnalytics(calculatedAnalytics);
      } else {
        // Reset to empty analytics if no trades in range
        setTrades([]);
        setAnalytics({
          overview: {
            totalPnL: 0,
            winRate: 0,
            totalTrades: 0,
            avgRR: 0,
            profitFactor: 0,
            avgWin: 0,
            avgLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            avgHoldTime: "0 hours"
          },
          bySymbol: [],
          byPlaybook: []
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive"
      });
    }
  };

  const calculateAnalytics = (trades: any[]) => {
    const totalTrades = trades.length;
    const completedTrades = trades.filter(t => t.pnl !== null);
    const winningTrades = completedTrades.filter(t => t.pnl > 0);
    const losingTrades = completedTrades.filter(t => t.pnl < 0);
    
    const totalPnL = completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0;
    
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / losingTrades.length : 0;
    
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;
    
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
    const avgRR = losingTrades.length > 0 ? avgWin / avgLoss : 0;

    // Group by symbol
    const symbolStats = trades.reduce((acc: any, trade) => {
      if (!acc[trade.symbol]) {
        acc[trade.symbol] = { trades: 0, pnl: 0, wins: 0 };
      }
      acc[trade.symbol].trades++;
      if (trade.pnl !== null) {
        acc[trade.symbol].pnl += trade.pnl;
        if (trade.pnl > 0) acc[trade.symbol].wins++;
      }
      return acc;
    }, {});

    const bySymbol = Object.entries(symbolStats)
      .map(([symbol, stats]: [string, any]) => ({
        symbol,
        trades: stats.trades,
        pnl: stats.pnl,
        winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
      }))
      .sort((a, b) => b.pnl - a.pnl);

    // Group by playbook
    const playbookStats = trades.reduce((acc: any, trade) => {
      const playbookName = trade.playbooks?.name || 'No Playbook';
      if (!acc[playbookName]) {
        acc[playbookName] = { trades: 0, pnl: 0, wins: 0 };
      }
      acc[playbookName].trades++;
      if (trade.pnl !== null) {
        acc[playbookName].pnl += trade.pnl;
        if (trade.pnl > 0) acc[playbookName].wins++;
      }
      return acc;
    }, {});

    const byPlaybook = Object.entries(playbookStats)
      .map(([name, stats]: [string, any]) => ({
        name,
        trades: stats.trades,
        pnl: stats.pnl,
        winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
      }))
      .sort((a, b) => b.pnl - a.pnl);

    return {
      overview: {
        totalPnL,
        winRate,
        totalTrades,
        avgRR,
        profitFactor,
        avgWin,
        avgLoss,
        largestWin,
        largestLoss,
        avgHoldTime: "N/A"
      },
      bySymbol,
      byPlaybook
    };
  };

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

  if (!selectedAccount) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-foreground">No Account Selected</h1>
          <p className="text-muted-foreground">Please select an account to view analytics</p>
        </div>
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(selectedAccount.currency);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Deep insights into trading performance for {selectedAccount.name}</p>
        </div>
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                {dateRange.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  "All Time"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">From Date</label>
                  <input
                    type="date"
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
                    value={dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      setDateRange({ ...dateRange, from: date });
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">To Date</label>
                  <input
                    type="date"
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
                    value={dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      setDateRange({ ...dateRange, to: date });
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const today = new Date();
                      const lastMonth = new Date();
                      lastMonth.setMonth(lastMonth.getMonth() - 1);
                      setDateRange({ from: lastMonth, to: today });
                    }}
                  >
                    Last 30 Days
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={() => {
            // Create a simple analytics report
            const reportData = [
              `Trading Analytics Report - ${selectedAccount.name}`,
              `Generated: ${new Date().toLocaleString()}`,
              '',
              'KEY METRICS:',
              `Total P&L: ${currencySymbol}${analytics.overview.totalPnL.toFixed(2)}`,
              `Win Rate: ${analytics.overview.winRate.toFixed(1)}%`,
              `Profit Factor: ${analytics.overview.profitFactor.toFixed(2)}`,
              `Average R:R: ${analytics.overview.avgRR.toFixed(1)}:1`,
              `Total Trades: ${analytics.overview.totalTrades}`,
              '',
              'TOP PERFORMING SYMBOLS:',
              ...analytics.bySymbol.slice(0, 5).map((item: any) => 
                `${item.symbol}: ${currencySymbol}${item.pnl.toFixed(2)} (${item.winRate.toFixed(1)}% win rate)`
              )
            ].join('\n');

            const blob = new Blob([reportData], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics_report_${selectedAccount.name}_${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            toast({
              title: "Report Exported",
              description: "Analytics report has been downloaded"
            });
          }}>Export Report</Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className={`h-4 w-4 ${analytics.overview.totalPnL >= 0 ? 'text-success' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.overview.totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {analytics.overview.totalPnL >= 0 ? '+' : ''}{currencySymbol}{analytics.overview.totalPnL.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.winRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.profitFactor.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg R:R</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.avgRR.toFixed(1)}:1</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalTrades}</div>
          </CardContent>
        </Card>
      </div>

      {/* Win/Loss Analysis */}
      <Card>
          <CardHeader>
            <CardTitle>Win/Loss Analysis</CardTitle>
            <CardDescription>Average profits vs losses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <span className="font-medium">Average Win</span>
                </div>
                <span className="text-lg font-bold text-success">
                  {currencySymbol}{analytics.overview.avgWin.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <span className="font-medium">Average Loss</span>
                </div>
                <span className="text-lg font-bold text-destructive">
                  {currencySymbol}{analytics.overview.avgLoss.toFixed(2)}
                </span>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Largest Win</span>
                  <span className="text-success font-medium">{currencySymbol}{analytics.overview.largestWin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Largest Loss</span>
                  <span className="text-destructive font-medium">{currencySymbol}{analytics.overview.largestLoss.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Performance Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equity Curve</CardTitle>
            <CardDescription>Account balance over time</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <EquityCurveChart className="h-full w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance by Symbol</CardTitle>
            <CardDescription>P&L breakdown by trading instrument</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <PnLBySymbolChart className="h-full w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Win/Loss Distribution</CardTitle>
            <CardDescription>Breakdown of trade outcomes</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <WinLossPieChart className="h-full w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily P&L</CardTitle>
            <CardDescription>Daily profit and loss (Last 30 days)</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <DailyPnLChart className="h-full w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Win Rate Trend</CardTitle>
            <CardDescription>Cumulative win rate over time</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <WinRateOverTimeChart className="h-full w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics */}
      <div className="space-y-6">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profit Factor by Month</CardTitle>
              <CardDescription>Monthly profit factor trends</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ProfitFactorChart className="h-full w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average R:R Analysis</CardTitle>
              <CardDescription>Initial vs actual risk-reward ratios</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <AverageRRChart className="h-full w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Drawdown Analysis</CardTitle>
              <CardDescription>Account drawdown over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <DrawdownChart trades={trades} startingBalance={selectedAccount.startingBalance} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expected Value</CardTitle>
              <CardDescription>Statistical edge in your trading</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ExpectedValueChart trades={trades} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance by Symbol Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Symbol</CardTitle>
          <CardDescription>Your best and worst performing instruments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.bySymbol.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No trades found for analysis</p>
              </div>
            ) : (
              analytics.bySymbol.map((item: any, index: number) => (
                <div key={item.symbol} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{item.symbol}</div>
                      <div className="text-sm text-muted-foreground">{item.trades} trades</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${item.pnl > 0 ? 'text-success' : 'text-destructive'}`}>
                      {item.pnl > 0 ? '+' : ''}{currencySymbol}{item.pnl.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">{item.winRate.toFixed(1)}% win rate</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance by Playbook */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Playbook</CardTitle>
          <CardDescription>Which trading strategies work best for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.byPlaybook.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No playbook data available</p>
              </div>
            ) : (
              analytics.byPlaybook.map((playbook: any, index: number) => (
                <div key={playbook.name} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">{playbook.name}</Badge>
                    <span className="text-sm text-muted-foreground">{playbook.trades} trades</span>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Win Rate</div>
                      <div className="font-medium">{playbook.winRate.toFixed(1)}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">P&L</div>
                      <div className={`font-bold ${playbook.pnl > 0 ? 'text-success' : 'text-destructive'}`}>
                        {playbook.pnl > 0 ? '+' : ''}{currencySymbol}{playbook.pnl.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}