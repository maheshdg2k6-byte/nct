import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, TrendingUp, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { TradingViewWidget } from "@/components/TradingViewWidget";

interface Portfolio {
  id: string;
  name: string;
  description: string;
  bio: string;
  share_trades: boolean;
  share_analytics: boolean;
  share_calendar: boolean;
  share_playbooks: boolean;
  max_shared_trades: number;
  focus_learnings: boolean;
  user_id: string;
}

export default function SharedPortfolio() {
  const { token } = useParams();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [calendarData, setCalendarData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');

  useEffect(() => {
    if (token) {
      loadPortfolio();
    }
  }, [token]);

  const loadPortfolio = async () => {
    try {
      // Load portfolio by share token
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('share_token', token)
        .eq('is_public', true)
        .single();

      if (portfolioError) throw new Error('Portfolio not found or is private');
      
      setPortfolio(portfolioData);

      // Load selected trades from portfolio_trades junction table
      if (portfolioData.share_trades) {
        const { data: portfolioTradesData, error: portfolioTradesError } = await supabase
          .from('portfolio_trades')
          .select(`
            trade_id,
            trades (*)
          `)
          .eq('portfolio_id', portfolioData.id);

        if (portfolioTradesError) throw portfolioTradesError;
        
        const tradesData = portfolioTradesData?.map(pt => pt.trades).filter(Boolean) || [];
        setTrades(tradesData as any[]);
        if (tradesData.length > 0) {
          setSelectedSymbol((tradesData[0] as any)?.symbol || '');
        }

        // Process calendar data if calendar sharing is enabled
        if (portfolioData.share_calendar && tradesData.length > 0) {
          const processedData: any = {};
          tradesData.forEach((trade: any) => {
            const dateKey = new Date(trade.created_at).toISOString().split('T')[0];
            if (!processedData[dateKey]) {
              processedData[dateKey] = { trades: 0, pnl: 0 };
            }
            processedData[dateKey].trades++;
            if (trade.pnl !== null) {
              processedData[dateKey].pnl += Number(trade.pnl);
            }
          });
          setCalendarData(processedData);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Portfolio Not Found</CardTitle>
            <CardDescription>
              {error || 'This portfolio does not exist or is no longer public'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const winningTrades = trades.filter(t => t.pnl && Number(t.pnl) > 0);
  const losingTrades = trades.filter(t => t.pnl && Number(t.pnl) < 0);
  const totalPnL = trades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  const filteredTradesForChart = selectedSymbol 
    ? trades.filter(t => t.symbol === selectedSymbol)
    : trades;

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const changeMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    const dayData = calendarData[dateKey];
    calendarDays.push({ day, dateKey, data: dayData });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-xl text-muted-foreground">{portfolio.description}</p>
          )}
          {portfolio.bio && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <p className="text-muted-foreground whitespace-pre-wrap">{portfolio.bio}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Overview */}
        {portfolio.share_analytics && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trades.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Winning Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{winningTrades.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Losing Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{losingTrades.length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="trades" className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${[portfolio.share_trades, portfolio.share_analytics, portfolio.share_calendar, true].filter(Boolean).length}, 1fr)` }}>
            {portfolio.share_trades && (
              <TabsTrigger value="trades">
                <BookOpen className="h-4 w-4 mr-2" />
                Trades
              </TabsTrigger>
            )}
            {portfolio.share_analytics && (
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            )}
            {portfolio.share_calendar && (
              <TabsTrigger value="calendar">
                <TrendingUp className="h-4 w-4 mr-2" />
                Calendar
              </TabsTrigger>
            )}
            <TabsTrigger value="learnings">
              <TrendingUp className="h-4 w-4 mr-2" />
              Learnings
            </TabsTrigger>
          </TabsList>

          {/* Trades Tab */}
          {portfolio.share_trades && (
            <TabsContent value="trades" className="space-y-4">
              {trades.length > 0 && (
                <div className="space-y-6">
                  {/* Trades List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Trades</CardTitle>
                      <CardDescription>
                        Click on a trade to view its chart
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {trades.map((trade) => (
                          <div
                            key={trade.id}
                            onClick={() => setSelectedSymbol(trade.symbol)}
                            className={`p-4 border rounded-lg space-y-2 cursor-pointer transition-colors ${
                              selectedSymbol === trade.symbol 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{trade.symbol}</Badge>
                                <Badge variant={trade.side === "Long" ? "default" : "secondary"}>
                                  {trade.side}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(trade.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              {!portfolio.focus_learnings && trade.pnl && (
                                <div
                                  className={`font-bold text-lg ${
                                    Number(trade.pnl) >= 0 ? 'text-success' : 'text-destructive'
                                  }`}
                                >
                                  {Number(trade.pnl) >= 0 ? '+' : ''}${Number(trade.pnl).toFixed(2)}
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Entry: </span>
                                <span className="font-medium">{Number(trade.entry_price).toFixed(5)}</span>
                              </div>
                              {trade.exit_price && (
                                <div>
                                  <span className="text-muted-foreground">Exit: </span>
                                  <span className="font-medium">{Number(trade.exit_price).toFixed(5)}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Size: </span>
                                <span className="font-medium">{Number(trade.size).toLocaleString()}</span>
                              </div>
                              {trade.initial_r2r && (
                                <div>
                                  <span className="text-muted-foreground">R:R: </span>
                                  <span className="font-medium">{Number(trade.initial_r2r).toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                            {trade.notes && !portfolio.focus_learnings && (
                              <p className="text-sm text-muted-foreground">{trade.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* TradingView Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>TradingView Chart - {selectedSymbol}</CardTitle>
                      <CardDescription>
                        Live chart with trade entry and exit points
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TradingViewWidget 
                        symbol={selectedSymbol || 'EURUSD'} 
                        trades={filteredTradesForChart}
                        className="h-[700px]"
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          )}

          {/* Analytics Tab */}
          {portfolio.share_analytics && (
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                  <CardDescription>Key metrics and insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <span className="font-medium">Win Rate</span>
                      <span className="text-lg font-bold">{winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <span className="font-medium">Total Trades</span>
                      <span className="text-lg font-bold">{trades.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-success/10 rounded-lg">
                      <span className="font-medium text-success">Winning Trades</span>
                      <span className="text-lg font-bold text-success">{winningTrades.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-destructive/10 rounded-lg">
                      <span className="font-medium text-destructive">Losing Trades</span>
                      <span className="text-lg font-bold text-destructive">{losingTrades.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Learnings Tab */}
          <TabsContent value="learnings">
            <Card>
              <CardHeader>
                <CardTitle>Key Learnings & Mistakes</CardTitle>
                <CardDescription>What I've learned from my trading journey</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trades.filter(t => t.notes).map((trade) => (
                    <div key={trade.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{trade.symbol}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(trade.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{trade.notes}</p>
                    </div>
                  ))}
                  {trades.filter(t => t.notes).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No learning notes shared yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          {portfolio.share_calendar && (
            <TabsContent value="calendar">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{monthNames[month]} {year}</CardTitle>
                      <CardDescription>Trading activity calendar</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
                        &larr; Prev
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                        Today
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
                        Next &rarr;
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((dayInfo, index) => {
                      let bgColorClass = "border-border hover:bg-muted/30";
                      if (dayInfo?.data?.pnl !== undefined) {
                        if (dayInfo.data.pnl > 0) {
                          bgColorClass = "border-border bg-success/10";
                        } else if (dayInfo.data.pnl < 0) {
                          bgColorClass = "border-border bg-destructive/10";
                        }
                      }
                      return (
                        <div key={index} className={`min-h-20 p-2 rounded-lg border ${dayInfo ? bgColorClass : ''}`}>
                          {dayInfo && (
                            <div>
                              <div className="font-medium mb-1">{dayInfo.day}</div>
                              {dayInfo.data && (
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">
                                    {dayInfo.data.trades} trade{dayInfo.data.trades !== 1 ? 's' : ''}
                                  </div>
                                  <div className={`text-xs font-medium ${dayInfo.data.pnl > 0 ? 'text-success' : 'text-destructive'}`}>
                                    {dayInfo.data.pnl > 0 ? '+' : ''}${dayInfo.data.pnl.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>This is a public trading portfolio shared for educational purposes</p>
        </div>
      </div>
    </div>
  );
}