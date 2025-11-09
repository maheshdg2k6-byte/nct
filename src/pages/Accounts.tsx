import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Edit, 
  Trash2,
  DollarSign,
  BarChart3,
  Target
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/hooks/use-toast";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { AccountManagementDialog } from "@/components/AccountManagementDialog";

export default function Accounts() {
  const { accounts, addAccount, setSelectedAccount, updateAccount, deleteAccount } = useAccount();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [selectedAccountForManagement, setSelectedAccountForManagement] = useState<any>(null);
  const [managementMode, setManagementMode] = useState<'edit' | 'deposit' | 'withdraw'>('edit');
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "",
    broker: "",
    currency: "USD",
    startingBalance: "",
    dailyDrawdown: "",
    maxDrawdown: "",
    profitTarget: "",
    phase: "1",
    drawdownType: "static" as 'static' | 'trailing'
  });

  const handleEditAccount = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedAccountForManagement(account);
      setManagementMode('edit');
      setShowManageDialog(true);
    }
  };

  const handleDeposit = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedAccountForManagement(account);
      setManagementMode('deposit');
      setShowManageDialog(true);
    }
  };

  const handleWithdraw = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedAccountForManagement(account);
      setManagementMode('withdraw');
      setShowManageDialog(true);
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    if (!confirm('Delete this account?')) return;
    deleteAccount(accountId);
    toast({ title: 'Deleted', description: 'Account removed' });
  };

  const handleAddAccount = async () => {
    console.log('=== ACCOUNT CREATION DEBUG ===');
    console.log('Form data:', newAccount);
    
    if (!newAccount.name || !newAccount.type || !newAccount.broker || !newAccount.startingBalance) {
      console.error('Validation failed - missing required fields');
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const accountData = {
        name: newAccount.name,
        type: newAccount.type as "Live" | "Demo" | "Backtesting" | "Prop Firm Challenge" | "Prop Funded/Live",
        broker: newAccount.broker,
        currency: newAccount.currency,
        startingBalance: parseFloat(newAccount.startingBalance),
        dailyDrawdown: newAccount.type === 'Prop Firm Challenge' || newAccount.type === 'Prop Funded/Live' ? parseFloat(newAccount.dailyDrawdown) || undefined : undefined,
        maxDrawdown: newAccount.type === 'Prop Firm Challenge' || newAccount.type === 'Prop Funded/Live' ? parseFloat(newAccount.maxDrawdown) || undefined : undefined,
        profitTarget: newAccount.type === 'Prop Firm Challenge' ? parseFloat(newAccount.profitTarget) || undefined : undefined,
        phase: newAccount.type === 'Prop Firm Challenge' ? parseInt(newAccount.phase) || 1 : undefined,
        drawdownType: newAccount.type === 'Prop Firm Challenge' || newAccount.type === 'Prop Funded/Live' ? newAccount.drawdownType : undefined
      };
      
      console.log('Calling addAccount with:', accountData);
      await addAccount(accountData as any);
      
      setNewAccount({ name: "", type: "", broker: "", currency: "USD", startingBalance: "", dailyDrawdown: "", maxDrawdown: "", profitTarget: "", phase: "1", drawdownType: "static" });
      setShowAddForm(false);
      console.log('Account created successfully');
    } catch (error) {
      console.error('=== ERROR CREATING ACCOUNT ===');
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive"
      });
    }
  };

  const totalAccountValue = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

  return (
    <div className="space-y-6">{/* Remove heading section */}

      {/* Account Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Account Value</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalAccountValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {accounts.length} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <BarChart3 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              +{accounts.reduce((sum, acc) => sum + acc.totalPnL, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All accounts combined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Account</CardTitle>
            <CardDescription>Create a new trading account to track</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                  id="account-name"
                  placeholder="My Trading Account"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-type">Account Type</Label>
                <Select value={newAccount.type} onValueChange={(value) => setNewAccount(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Live">Live Trading</SelectItem>
                    <SelectItem value="Demo">Demo/Paper</SelectItem>
                    <SelectItem value="Prop Firm Challenge">Prop Firm Challenge</SelectItem>
                    <SelectItem value="Prop Funded/Live">Prop Funded/Live</SelectItem>
                    <SelectItem value="Backtesting">Backtesting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="broker">Broker *</Label>
                <Input
                  id="broker"
                  placeholder="Interactive Brokers"
                  value={newAccount.broker}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, broker: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select value={newAccount.currency} onValueChange={(value) => setNewAccount(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="starting-balance">Starting Balance *</Label>
                <Input
                  id="starting-balance"
                  type="number"
                  placeholder="50000"
                  value={newAccount.startingBalance}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, startingBalance: e.target.value }))}
                />
              </div>
            </div>

            {/* Prop Firm Challenge specific fields */}
            {newAccount.type === 'Prop Firm Challenge' && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="drawdownType">Drawdown Type</Label>
                  <Select value={newAccount.drawdownType} onValueChange={(value: 'static' | 'trailing') => setNewAccount(prev => ({ ...prev, drawdownType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select drawdown type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Static</SelectItem>
                      <SelectItem value="trailing">Trailing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-drawdown">Daily Drawdown (%)</Label>
                  <Input
                    id="daily-drawdown"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={newAccount.dailyDrawdown}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, dailyDrawdown: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-drawdown">Maximum Drawdown (%)</Label>
                  <Input
                    id="max-drawdown"
                    type="number"
                    step="0.01"
                    placeholder="10.00"
                    value={newAccount.maxDrawdown}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, maxDrawdown: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profit-target">Profit Target ({newAccount.currency === 'USD' ? '$' : newAccount.currency === 'EUR' ? '€' : newAccount.currency === 'GBP' ? '£' : newAccount.currency === 'JPY' ? '¥' : newAccount.currency === 'INR' ? '₹' : '$'})</Label>
                  <Input
                    id="profit-target"
                    type="number"
                    step="0.01"
                    placeholder="800.00"
                    value={newAccount.profitTarget}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, profitTarget: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phase">Phase</Label>
                  <Select value={newAccount.phase} onValueChange={(value) => setNewAccount(prev => ({ ...prev, phase: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Phase 1</SelectItem>
                      <SelectItem value="2">Phase 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Prop Funded/Live specific fields */}
            {newAccount.type === 'Prop Funded/Live' && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="drawdownType">Drawdown Type</Label>
                  <Select value={newAccount.drawdownType} onValueChange={(value: 'static' | 'trailing') => setNewAccount(prev => ({ ...prev, drawdownType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select drawdown type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Static</SelectItem>
                      <SelectItem value="trailing">Trailing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-drawdown-live">Daily Drawdown (%)</Label>
                  <Input
                    id="daily-drawdown-live"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={newAccount.dailyDrawdown}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, dailyDrawdown: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-drawdown-live">Maximum Drawdown (%)</Label>
                  <Input
                    id="max-drawdown-live"
                    type="number"
                    step="0.01"
                    placeholder="10.00"
                    value={newAccount.maxDrawdown}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, maxDrawdown: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAccount}>
                Add Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts List */}
      <div className="grid gap-6">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <CardTitle>{account.name}</CardTitle>
                  </div>
                  <Badge variant={account.type === "Live" ? "default" : "secondary"}>
                    {account.type}
                  </Badge>
                  <Badge variant="outline" className="text-primary">
                    {account.currency}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleDeposit(account.id)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Deposit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleWithdraw(account.id)}>
                    <TrendingDown className="h-4 w-4 mr-1" />
                    Withdraw
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEditAccount(account.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteAccount(account.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>{account.broker}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Starting Balance</div>
                  <div className="text-lg font-semibold">
                    {account.currency === 'USD' ? '$' : account.currency === 'EUR' ? '€' : account.currency === 'GBP' ? '£' : account.currency === 'JPY' ? '¥' : account.currency === 'INR' ? '₹' : '$'}{account.startingBalance.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Current Balance</div>
                  <div className="text-lg font-semibold">
                    {account.currency === 'USD' ? '$' : account.currency === 'EUR' ? '€' : account.currency === 'GBP' ? '£' : account.currency === 'JPY' ? '¥' : account.currency === 'INR' ? '₹' : '$'}{account.currentBalance.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total P&L</div>
                  <div className={`text-lg font-semibold flex items-center ${
                    account.totalPnL >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {account.totalPnL >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {account.totalPnL >= 0 ? '+' : ''}{account.currency === 'USD' ? '$' : account.currency === 'EUR' ? '€' : account.currency === 'GBP' ? '£' : account.currency === 'JPY' ? '¥' : account.currency === 'INR' ? '₹' : '$'}{account.totalPnL.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                  <div className="text-lg font-semibold">{account.totalTrades}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                  <div className="text-lg font-semibold">{account.winRate}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FloatingActionButton
        onClick={() => setShowAddForm(true)}
        icon={Plus}
        label="Add Account"
      />

      <AccountManagementDialog
        open={showManageDialog}
        onOpenChange={setShowManageDialog}
        account={selectedAccountForManagement}
        mode={managementMode}
      />
    </div>
  );
}