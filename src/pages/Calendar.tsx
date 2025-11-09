import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useTradeActions } from "@/hooks/useTradeActions";
import { useAccount } from "@/contexts/AccountContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AddTradeDialog } from "@/components/AddTradeDialog";
import { FloatingActionButton } from "@/components/FloatingActionButton";


export default function Calendar() {
  const { selectedAccount } = useAccount();
  const { user } = useAuth();
  const { showAddTrade, setShowAddTrade } = useTradeActions();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<any>({});
  const [todayTrades, setTodayTrades] = useState([]);
    const [monthlyStats, setMonthlyStats] = useState({
      totalTrades: 0,
      tradingDays: 0,
      winRate: 0,
      monthlyPnL: 0,
      weeklyPnL: 0
    });

  useEffect(() => {
    if (user && selectedAccount) {
      loadCalendarData();
    }
  }, [user, selectedAccount, currentDate]);

  // Real-time listener for trades
  useEffect(() => {
    if (!user || !selectedAccount) return;

    const channel = supabase
      .channel('calendar-trades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadCalendarData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedAccount, currentDate]);

  const loadCalendarData = async () => {
    if (!user || !selectedAccount) return;
    
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', selectedAccount.id.toString())
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Process trades into calendar format
      const processedData: any = {};
      const tradesByDate: any = {};
      let totalPnL = 0;
      let winningTrades = 0;
      let totalTrades = 0;

      trades?.forEach((trade: any) => {
        const dateKey = new Date(trade.created_at).toISOString().split('T')[0];
        
        if (!processedData[dateKey]) {
          processedData[dateKey] = { trades: 0, pnl: 0 };
          tradesByDate[dateKey] = [];
        }
        
        processedData[dateKey].trades++;
        if (trade.pnl !== null) {
          processedData[dateKey].pnl += trade.pnl;
          totalPnL += trade.pnl;
          totalTrades++;
          if (trade.pnl > 0) winningTrades++;
        }
        
        tradesByDate[dateKey].push(trade);
      });

      setCalendarData(processedData);
      
      // Calculate monthly stats
      const tradingDays = Object.keys(processedData).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      
      setMonthlyStats({
        totalTrades: trades?.length || 0,
        tradingDays,
        winRate,
        monthlyPnL: totalPnL,
        weeklyPnL: 0 // Will be calculated properly later
      });

      // Get today's trades
      const today = new Date().toISOString().split('T')[0];
      setTodayTrades(tradesByDate[today] || []);
      
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
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
          <p className="text-muted-foreground">Please select an account to view calendar</p>
        </div>
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(selectedAccount.currency);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = [];

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    const dayData = calendarData[dateKey];
    calendarDays.push({
      day,
      dateKey,
      data: dayData
    });
  }

  return (
    <div className="space-y-6">{/* Remove heading section */}

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        {/* Calendar Grid */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <CardTitle className="text-lg sm:text-xl">
                    {monthNames[month]} {year}
                  </CardTitle>
                   <Select value={`${year}-${month}`} onValueChange={(value) => {
                     const [selectedYear, selectedMonth] = value.split('-');
                     setCurrentDate(new Date(parseInt(selectedYear), parseInt(selectedMonth), 1));
                   }}>
                     <SelectTrigger className="w-40">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {Array.from({ length: 60 }, (_, i) => {
                         const date = new Date();
                         date.setMonth(date.getMonth() - 30 + i);
                         const yearMonth = `${date.getFullYear()}-${date.getMonth()}`;
                         return (
                           <SelectItem key={yearMonth} value={yearMonth}>
                             {monthNames[date.getMonth()]} {date.getFullYear()}
                           </SelectItem>
                         );
                       })}
                     </SelectContent>
                   </Select>
                </div>
                <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')} className="hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')} className="hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-1 sm:p-2">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarDays.map((dayInfo, index) => {
                  // Determine background color based on P&L
                  let bgColorClass = "border-border hover:bg-muted/30";
                  if (dayInfo?.data?.pnl !== undefined) {
                    if (dayInfo.data.pnl > 500) {
                      bgColorClass = "border-border bg-success/20 hover:bg-muted/50";
                    } else if (dayInfo.data.pnl > 0) {
                      bgColorClass = "border-border bg-success/10 hover:bg-muted/30";
                    } else if (dayInfo.data.pnl < -500) {
                      bgColorClass = "border-border bg-destructive/20 hover:bg-muted/50";
                    } else if (dayInfo.data.pnl < 0) {
                      bgColorClass = "border-border bg-destructive/10 hover:bg-muted/30";
                    }
                  }
                  
                  return (
                    <div
                      key={index}
                      className={`
                        min-h-16 sm:min-h-20 p-1 sm:p-2 rounded-lg border cursor-pointer transition-colors text-xs sm:text-sm
                        ${dayInfo ? bgColorClass : ''}
                        ${selectedDate === dayInfo?.dateKey ? 'bg-primary/20 border-primary' : ''}
                      `}
                      onClick={async () => {
                        if (dayInfo && user && selectedAccount) {
                          setSelectedDate(dayInfo.dateKey);
                          
                          // Load trades for this specific day
                          try {
                            const startOfDay = new Date(dayInfo.dateKey + 'T00:00:00.000Z');
                            const endOfDay = new Date(dayInfo.dateKey + 'T23:59:59.999Z');
                            
                            const { data: dayTrades, error } = await supabase
                              .from('trades')
                              .select('*')
                              .eq('user_id', user.id)
                              .eq('account_id', selectedAccount.id.toString())
                              .gte('created_at', startOfDay.toISOString())
                              .lte('created_at', endOfDay.toISOString());
                            
                            if (error) throw error;
                            setTodayTrades(dayTrades || []);
                          } catch (error) {
                            console.error('Error loading day trades:', error);
                            setTodayTrades([]);
                          }
                        }
                      }}
                    >
                      {dayInfo && (
                        <div>
                          <div className="font-medium mb-1">{dayInfo.day}</div>
                          {dayInfo.data && (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">
                                {dayInfo.data.trades} trade{dayInfo.data.trades !== 1 ? 's' : ''}
                              </div>
                              <div className={`text-xs font-medium ${
                                dayInfo.data.pnl > 0 ? 'text-success' : 'text-destructive'
                              }`}>
                                {dayInfo.data.pnl > 0 ? '+' : ''}{currencySymbol}{dayInfo.data.pnl.toFixed(2)}
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
        </div>

      {/* Sidebar Information */}
        <div className="space-y-6">
          {/* Weekly P&L Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly P&L</CardTitle>
              <CardDescription>Current week performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <div className={`text-2xl font-bold ${monthlyStats.weeklyPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {monthlyStats.weeklyPnL >= 0 ? '+' : ''}{currencySymbol}{monthlyStats.weeklyPnL.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">This Week</div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
              <CardDescription>{monthNames[month]} {year}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Trades</span>
                <span className="font-medium">{monthlyStats.totalTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trading Days</span>
                <span className="font-medium">{monthlyStats.tradingDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-medium">{monthlyStats.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly P&L</span>
                <span className={`font-medium ${monthlyStats.monthlyPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {monthlyStats.monthlyPnL >= 0 ? '+' : ''}{currencySymbol}{monthlyStats.monthlyPnL.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Today's Trades */}
          <Card>
            <CardHeader>
              <CardTitle>Selected Day</CardTitle>
              <CardDescription>
                {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Today'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayTrades.map((trade: any) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {trade.side === "Long" ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <div className="font-medium">{trade.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(trade.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className={`font-medium ${
                      trade.pnl > 0 ? 'text-success' : trade.pnl < 0 ? 'text-destructive' : ''
                    }`}>
                      {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}${currencySymbol}${trade.pnl.toFixed(2)}` : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      <FloatingActionButton
        onClick={() => setShowAddTrade(true)}
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