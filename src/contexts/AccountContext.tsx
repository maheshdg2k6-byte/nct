import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SupabaseAccount {
  id: string;
  user_id: string;
  name: string;
  type: "Live" | "Demo" | "Backtesting" | "Prop Firm Challenge" | "Prop Funded/Live";
  broker: string;
  currency: string;
  starting_balance: number;
  current_balance: number;
  total_pnl: number;
  total_trades: number;
  win_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  daily_drawdown?: number;
  max_drawdown?: number;
  profit_target?: number;
  phase?: number;
  drawdown_type?: 'static' | 'trailing';
}

interface Account {
  id: string;
  name: string;
  type: "Live" | "Demo" | "Backtesting" | "Prop Firm Challenge" | "Prop Funded/Live";
  broker: string;
  currency: string;
  startingBalance: number;
  currentBalance: number;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  isActive: boolean;
  dailyDrawdown?: number;
  maxDrawdown?: number;
  profitTarget?: number;
  phase?: number;
  drawdownType?: 'static' | 'trailing';
}

interface AccountContextType {
  accounts: Account[];
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account) => void;
  addAccount: (account: Omit<Account, 'id' | 'currentBalance' | 'totalPnL' | 'totalTrades' | 'winRate' | 'isActive'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  loading: boolean;
  reloadAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

// Transform Supabase account to local account format
const transformSupabaseAccount = (acc: SupabaseAccount): Account => ({
  id: acc.id,
  name: acc.name,
  type: acc.type,
  broker: acc.broker,
  currency: acc.currency,
  startingBalance: Number(acc.starting_balance),
  currentBalance: Number(acc.current_balance),
  totalPnL: Number(acc.total_pnl),
  totalTrades: acc.total_trades,
  winRate: Number(acc.win_rate),
  isActive: acc.is_active,
  dailyDrawdown: acc.daily_drawdown ? Number(acc.daily_drawdown) : undefined,
  maxDrawdown: acc.max_drawdown ? Number(acc.max_drawdown) : undefined,
  profitTarget: acc.profit_target ? Number(acc.profit_target) : undefined,
  phase: acc.phase,
  drawdownType: acc.drawdown_type || 'static'
});

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccountState] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load accounts from Supabase (optimized)
  const loadAccounts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('accounts' as any)
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedAccounts = (data || []).map(acc => transformSupabaseAccount(acc as any as SupabaseAccount));
      setAccounts(transformedAccounts);
      
      // Set selected account to the active one or first one
      const activeAccount = transformedAccounts.find(acc => acc.isActive);
      const selectedAcc = activeAccount || transformedAccounts[0] || null;
      setSelectedAccountState(selectedAcc);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: "Error loading accounts",
        description: "Could not load your accounts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const setSelectedAccount = async (account: Account) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setSelectedAccountState(account);
      
      // Update all accounts to set only this one as active
      await supabase
        .from('accounts' as any)
        .update({ is_active: false })
        .eq('user_id', session.user.id);

      await supabase
        .from('accounts' as any)
        .update({ is_active: true })
        .eq('id', account.id)
        .eq('user_id', session.user.id);

      // Update local state
      setAccounts(prev => prev.map(acc => ({
        ...acc,
        isActive: acc.id === account.id
      })));
    } catch (error) {
      console.error('Error setting selected account:', error);
      toast({
        title: "Error",
        description: "Could not update selected account.",
        variant: "destructive",
      });
    }
  };

  const addAccount = async (accountData: Omit<Account, 'id' | 'currentBalance' | 'totalPnL' | 'totalTrades' | 'winRate' | 'isActive'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const isFirst = accounts.length === 0;
      
      const insertData: any = {
        user_id: session.user.id,
        name: accountData.name,
        type: accountData.type,
        broker: accountData.broker,
        currency: accountData.currency,
        starting_balance: accountData.startingBalance,
        current_balance: accountData.startingBalance,
        is_active: isFirst
      };

      // Add prop firm specific fields if applicable
      if (accountData.type === 'Prop Firm Challenge') {
        insertData.daily_drawdown = accountData.dailyDrawdown ?? null;
        insertData.max_drawdown = accountData.maxDrawdown ?? null;
        insertData.profit_target = accountData.profitTarget ?? null;
        insertData.phase = accountData.phase ?? 1;
        insertData.drawdown_type = (accountData as any).drawdownType ?? 'static';
      } else if (accountData.type === 'Prop Funded/Live') {
        insertData.daily_drawdown = accountData.dailyDrawdown ?? null;
        insertData.max_drawdown = accountData.maxDrawdown ?? null;
        insertData.profit_target = null;
        insertData.phase = null;
        insertData.drawdown_type = (accountData as any).drawdownType ?? 'static';
      } else {
        // For non-prop firm accounts, set these fields to null
        insertData.daily_drawdown = null;
        insertData.max_drawdown = null;
        insertData.profit_target = null;
        insertData.phase = null;
        insertData.drawdown_type = null;
      }

      console.log('Creating account with data:', insertData);
      
      const { data, error } = await supabase
        .from('accounts' as any)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating account:', error);
        throw error;
      }

      console.log('Account created successfully:', data);

      const newAccount = transformSupabaseAccount(data as any as SupabaseAccount);
      setAccounts(prev => [...prev, newAccount]);
      
      if (isFirst) {
        setSelectedAccountState(newAccount);
      }

      toast({
        title: "Account created",
        description: `${accountData.name} has been added successfully.`,
      });
    } catch (error) {
      console.error('Error adding account:', error);
      toast({
        title: "Error creating account",
        description: error instanceof Error ? error.message : "Could not create the account. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const supabaseUpdates: any = {};
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.type !== undefined) supabaseUpdates.type = updates.type;
      if (updates.broker !== undefined) supabaseUpdates.broker = updates.broker;
      if (updates.currency !== undefined) supabaseUpdates.currency = updates.currency;
      if (updates.startingBalance !== undefined) supabaseUpdates.starting_balance = updates.startingBalance;
      if (updates.currentBalance !== undefined) supabaseUpdates.current_balance = updates.currentBalance;
      if (updates.totalPnL !== undefined) supabaseUpdates.total_pnl = updates.totalPnL;
      if (updates.totalTrades !== undefined) supabaseUpdates.total_trades = updates.totalTrades;
      if (updates.winRate !== undefined) supabaseUpdates.win_rate = updates.winRate;
      if (updates.dailyDrawdown !== undefined) supabaseUpdates.daily_drawdown = updates.dailyDrawdown;
      if (updates.maxDrawdown !== undefined) supabaseUpdates.max_drawdown = updates.maxDrawdown;
      if (updates.profitTarget !== undefined) supabaseUpdates.profit_target = updates.profitTarget;
      if (updates.phase !== undefined) supabaseUpdates.phase = updates.phase;
      if ((updates as any).drawdownType !== undefined) supabaseUpdates.drawdown_type = (updates as any).drawdownType;

      console.log('Updating account with data:', supabaseUpdates);

      const { error } = await supabase
        .from('accounts' as any)
        .update(supabaseUpdates)
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Supabase error updating account:', error);
        throw error;
      }

      console.log('Account updated successfully');

      setAccounts(prev => prev.map(acc => 
        acc.id === id ? { ...acc, ...updates } : acc
      ));
      
      if (selectedAccount?.id === id) {
        setSelectedAccountState(prev => prev ? { ...prev, ...updates } : null);
      }

      toast({
        title: "Account updated",
        description: "Account has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating account:', error);
      toast({
        title: "Error updating account",
        description: error instanceof Error ? error.message : "Could not update the account. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('accounts' as any)
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setAccounts(prev => prev.filter(acc => acc.id !== id));
      setSelectedAccountState(prev => (prev && prev.id === id) ? null : prev);

      toast({
        title: "Account deleted",
        description: "Account has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error deleting account",
        description: "Could not delete the account. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
<AccountContext.Provider value={{
  accounts,
  selectedAccount,
  setSelectedAccount,
  addAccount,
  updateAccount,
  deleteAccount,
  loading,
  reloadAccounts: loadAccounts
}}>
  {children}
</AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}

export type { Account };