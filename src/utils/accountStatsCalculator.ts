import { supabase } from "@/integrations/supabase/client";

export interface AccountStats {
  currentBalance: number;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
}

export async function calculateAccountStats(accountId: string, userId: string): Promise<AccountStats> {
  try {
    // Get account starting balance and manual adjustments
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('starting_balance, manual_adjustments')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (accountError) throw accountError;

    // Get all trades for this account
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('pnl')
      .eq('account_id', accountId)
      .eq('user_id', userId);

    if (tradesError) throw tradesError;

    // Calculate stats
    const startingBalance = Number(account.starting_balance);
    const manualAdjustments = Number(account.manual_adjustments) || 0;
    const totalTrades = trades?.length || 0;
    const totalPnL = trades?.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0) || 0;
    const currentBalance = startingBalance + manualAdjustments + totalPnL;
    
    // Calculate win rate
    const completedTrades = trades?.filter(trade => trade.pnl !== null) || [];
    const winningTrades = completedTrades.filter(trade => Number(trade.pnl) > 0);
    const winRate = completedTrades.length > 0 ? Math.round((winningTrades.length / completedTrades.length) * 100) : 0;

    return {
      currentBalance,
      totalPnL,
      totalTrades,
      winRate
    };
  } catch (error) {
    console.error('Error calculating account stats:', error);
    return {
      currentBalance: 0,
      totalPnL: 0,
      totalTrades: 0,
      winRate: 0
    };
  }
}

export async function updateAccountStats(accountId: string, userId: string): Promise<void> {
  try {
    const stats = await calculateAccountStats(accountId, userId);
    
    // Get account data to calculate trailing drawdown
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('starting_balance, drawdown_type, daily_drawdown, max_drawdown, peak_balance')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (accountError) throw accountError;

    let updateData: any = {
      current_balance: stats.currentBalance,
      total_pnl: stats.totalPnL,
      total_trades: stats.totalTrades,
      win_rate: stats.winRate
    };

    // Calculate trailing drawdown if enabled
    if (account.drawdown_type === 'trailing') {
      const currentPeakBalance = Number(account.peak_balance) || Number(account.starting_balance);
      const currentBalance = Number(stats.currentBalance);
      
      // Update peak balance only if current balance is higher
      const newPeakBalance = Math.max(currentPeakBalance, currentBalance);
      
      // Calculate daily drawdown limit based on peak
      const dailyDrawdownPercent = Number(account.daily_drawdown) || 0;
      const dailyDrawdownLimit = newPeakBalance * (1 - (dailyDrawdownPercent / 100));
      
      // Calculate max drawdown limit based on peak
      const maxDrawdownPercent = Number(account.max_drawdown) || 0;
      const maxDrawdownLimit = newPeakBalance * (1 - (maxDrawdownPercent / 100));
      
      updateData.peak_balance = newPeakBalance;
      updateData.daily_drawdown_limit = dailyDrawdownLimit;
      updateData.max_drawdown_limit = maxDrawdownLimit;
    }
    
    const { error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating account stats:', error);
    throw error;
  }
}