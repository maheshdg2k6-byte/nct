import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  BarChart3,
  Calendar,
  Wallet,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import { useTradeActions } from "@/hooks/useTradeActions";
import { AddTradeDialog } from "@/components/AddTradeDialog";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { supabase } from "@/integrations/supabase/client";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { PnLBySymbolChart } from "@/components/PnLBySymbolChart";
import { TradingViewWidget } from "@/components/TradingViewWidget";

export default function Dashboard() {
  const { selectedAccount } = useAccount();
  const { addTrade, viewAllTrades, showAddTrade, setShowAddTrade } = useTradeActions();
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const TRADES_PER_PAGE = 5;

  // Load recent trades from Supabase
  useEffect(() => {
    const loadRecentTrades = async () => {
      if (!selectedAccount) {
        setRecentTrades([]);
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('account_id', selectedAccount.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setRecentTrades(data || []);
        // Load saved symbol from localStorage or don't auto-select
        const savedSymbol = localStorage.getItem('dashboard-selected-symbol');
        if (savedSymbol) {
          setSelectedSymbol(savedSymbol);
        }
      } catch (error) {
        console.error('Error loading recent trades:', error);
        setRecentTrades([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecentTrades();
  }, [selectedAccount]);

  // Real-time listener for trades  
  useEffect(() => {
    if (!selectedAccount) return;

    const channel = supabase
      .channel('dashboard-trades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'trades',
          filter: `account_id=eq.${selectedAccount.id}`
        },
        async () => {
          // Reload trades when any change happens
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data, error } = await supabase
              .from('trades')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('account_id', selectedAccount.id)
              .order('created_at', { ascending: false });

            if (error) throw error;
            setRecentTrades(data || []);
          } catch (error) {
            console.error('Error loading recent trades:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAccount]);

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

  const calculateAvgRR = (trades: any[]) => {
    const completedTrades = trades.filter(t => t.entry_price && t.exit_price && t.stop_loss);
    if (completedTrades.length === 0) return 0;
    
    const ratios = completedTrades.map(t => {
      const entry = Number(t.entry_price);
      const exit = Number(t.exit_price);
      const stopLoss = Number(t.stop_loss);
      
      const risk = Math.abs(entry - stopLoss);
      const reward = Math.abs(exit - entry);
      
      return risk > 0 ? reward / risk : 0;
    });
    
    return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  };

  // Show zeroed cards when no account is selected
  const currencySymbol = getCurrencySymbol(selectedAccount?.currency || 'USD');

  const paginatedTrades = recentTrades.slice(
    currentPage * TRADES_PER_PAGE,
    (currentPage + 1) * TRADES_PER_PAGE
  );

  const totalPages = Math.ceil(recentTrades.length / TRADES_PER_PAGE);

  const filteredTradesForChart = selectedSymbol 
    ? recentTrades.filter(t => t.symbol === selectedSymbol)
    : [];

  const handleTradeClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    localStorage.setItem('dashboard-selected-symbol', symbol);
  };

  return (
    <div className="space-y-8">{/* Remove the top section with heading and button */}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {currencySymbol}{(selectedAccount?.currentBalance ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Starting: {currencySymbol}{(selectedAccount?.startingBalance ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className={`h-4 w-4 ${(selectedAccount?.totalPnL ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${(selectedAccount?.totalPnL ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {(selectedAccount?.totalPnL ?? 0) >= 0 ? '+' : ''}{currencySymbol}{(selectedAccount?.totalPnL ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(((selectedAccount?.totalPnL ?? 0) / ((selectedAccount?.startingBalance ?? 0) || 1)) * 100).toFixed(1)}% return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{(selectedAccount?.winRate ?? 0)}%</div>
            <p className="text-xs text-muted-foreground">
              {(selectedAccount?.totalTrades ?? 0)} total trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg R:R</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {selectedAccount && recentTrades.length > 0 ? 
                calculateAvgRR(recentTrades).toFixed(1) : '0.0'}:1
            </div>
            <p className="text-xs text-muted-foreground">
              Risk to reward ratio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Type</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{selectedAccount?.type ?? '-'}</div>
            <p className="text-xs text-muted-foreground">
              {selectedAccount?.broker ?? '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equity Curve</CardTitle>
            <CardDescription>Your account balance over time</CardDescription>
          </CardHeader>
          <CardContent className="h-60 sm:h-80 p-0">
            <EquityCurveChart className="h-full w-full p-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>P&L by Symbol</CardTitle>
            <CardDescription>Performance breakdown by instrument</CardDescription>
          </CardHeader>
          <CardContent className="h-60 sm:h-80 p-0">
            <PnLBySymbolChart className="h-full w-full p-4" />
          </CardContent>
        </Card>
      </div>

      {/* Trade History and Chart - Single Column Layout */}
      {recentTrades.length > 0 && (
        <div className="space-y-6">
          {/* Recent Trades */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
              <CardDescription>Click on a trade to view its chart</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center text-muted-foreground py-8">Loading trades...</div>
                ) : paginatedTrades.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No trades found. Add your first trade!
                  </div>
                ) : paginatedTrades.map((trade) => (
                  <div
                    key={trade.id}
                    onClick={() => handleTradeClick(trade.symbol)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4 sm:gap-0 cursor-pointer ${
                      selectedSymbol === trade.symbol 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                         <span className="text-sm text-muted-foreground">
                           {new Date(trade.created_at).toLocaleDateString()}
                         </span>
                      </div>
                      <Badge variant="outline">{trade.symbol}</Badge>
                      <Badge variant={trade.side === "Long" ? "default" : "secondary"}>
                        {trade.side}
                      </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      {trade.entry_price && trade.exit_price && (
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-medium">
                            {currencySymbol}{Number(trade.entry_price).toFixed(2)} → {currencySymbol}{Number(trade.exit_price).toFixed(2)}
                          </div>
                        </div>
                      )}
                      {trade.pnl && (
                        <div className={`text-left sm:text-right font-medium ${
                          Number(trade.pnl) > 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {Number(trade.pnl) > 0 ? '+' : ''}{currencySymbol}{Number(trade.pnl).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage === totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* TradingView Chart - Only show when symbol is selected */}
          {selectedSymbol && (
            <Card>
              <CardHeader>
                <CardTitle>TradingView Chart - {selectedSymbol}</CardTitle>
                <CardDescription>Live chart with trade entry and exit points</CardDescription>
              </CardHeader>
              <CardContent>
                <TradingViewWidget 
                  symbol={selectedSymbol} 
                  trades={filteredTradesForChart}
                  className="h-[700px]"
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <FloatingActionButton
        onClick={addTrade}
        icon={Plus}
        label="Add Trade"
      />

      <AddTradeDialog 
        open={showAddTrade} 
        onOpenChange={setShowAddTrade} 
      />
    </div>
  );
}