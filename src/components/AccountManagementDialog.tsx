import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AccountManagementDialogProps {
  account: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'edit' | 'deposit' | 'withdraw';
}

export function AccountManagementDialog({ account, open, onOpenChange, mode }: AccountManagementDialogProps) {
  const { updateAccount } = useAccount();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    broker: "",
    currency: "",
    startingBalance: "",
    currentBalance: "",
    amount: "", // For deposit/withdraw
    dailyDrawdown: "", // For prop firm accounts (percentage)
    maxDrawdown: "", // For prop firm accounts (percentage)
    profitTarget: "", // For prop firm accounts
    phase: "1", // For prop firm accounts
    drawdownType: "static" as 'static' | 'trailing'
  });

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || "",
        type: account.type || "",
        broker: account.broker || "",
        currency: account.currency || "",
        startingBalance: account.startingBalance?.toString() || "",
        currentBalance: account.currentBalance?.toString() || "",
        amount: "",
        dailyDrawdown: account.dailyDrawdown?.toString() || "",
        maxDrawdown: account.maxDrawdown?.toString() || "",
        profitTarget: account.profitTarget?.toString() || "",
        phase: account.phase?.toString() || "1",
        drawdownType: account.drawdownType || 'static'
      });
    }
  }, [account]);

  const handleSubmit = async () => {
    if (!user) return;

    try {
      if (mode === 'edit') {
        if (!account) return;
        
        // Validate required fields
        if (!formData.name || !formData.type || !formData.broker || !formData.currency) {
          toast({
            title: "Error",
            description: "Please fill in all required fields",
            variant: "destructive"
          });
          return;
        }

        const updatedData: any = {
          name: formData.name,
          type: formData.type,
          broker: formData.broker,
          currency: formData.currency,
          starting_balance: parseFloat(formData.startingBalance) || 0,
          current_balance: parseFloat(formData.currentBalance) || 0
        };

          // Add prop firm specific fields if applicable
          if (formData.type === 'Prop Firm Challenge') {
            updatedData.daily_drawdown = parseFloat(formData.dailyDrawdown) || null;
            updatedData.max_drawdown = parseFloat(formData.maxDrawdown) || null;
            updatedData.profit_target = parseFloat(formData.profitTarget) || null;
            updatedData.phase = parseInt(formData.phase) || 1;
            updatedData.drawdown_type = formData.drawdownType || 'static';
          } else if (formData.type === 'Prop Funded/Live') {
            updatedData.daily_drawdown = parseFloat(formData.dailyDrawdown) || null;
            updatedData.max_drawdown = parseFloat(formData.maxDrawdown) || null;
            updatedData.profit_target = null;
            updatedData.phase = null;
            updatedData.drawdown_type = formData.drawdownType || 'static';
          } else {
            // For non-prop firm accounts, set drawdown fields to null
            updatedData.daily_drawdown = null;
            updatedData.max_drawdown = null;
            updatedData.profit_target = null;
            updatedData.phase = null;
            updatedData.drawdown_type = null;
          }

        const { error } = await supabase
          .from('accounts')
          .update(updatedData)
          .eq('id', account.id)
          .eq('user_id', user.id);

        if (error) throw error;

        await updateAccount(account.id, {
          ...account,
          name: formData.name,
          type: formData.type,
          broker: formData.broker,
          currency: formData.currency,
          startingBalance: parseFloat(formData.startingBalance) || 0,
          currentBalance: parseFloat(formData.currentBalance) || 0,
          dailyDrawdown: formData.type === 'Prop Firm Challenge' || formData.type === 'Prop Funded/Live' ? parseFloat(formData.dailyDrawdown) || null : null,
          maxDrawdown: formData.type === 'Prop Firm Challenge' || formData.type === 'Prop Funded/Live' ? parseFloat(formData.maxDrawdown) || null : null,
          profitTarget: formData.type === 'Prop Firm Challenge' ? parseFloat(formData.profitTarget) || null : null,
          phase: formData.type === 'Prop Firm Challenge' ? parseInt(formData.phase) || 1 : null,
          drawdownType: formData.type === 'Prop Firm Challenge' || formData.type === 'Prop Funded/Live' ? formData.drawdownType : undefined
        });

        toast({
          title: "Account Updated",
          description: "Account details have been successfully updated",
        });
      } else {
        // Handle deposit/withdraw
        if (!account) return;
        
        const amount = parseFloat(formData.amount);
        if (!amount || amount <= 0) {
          toast({
            title: "Error",
            description: "Please enter a valid amount",
            variant: "destructive"
          });
          return;
        }

        // Calculate new manual adjustments
        const currentAdjustments = Number(account.manualAdjustments) || 0;
        const newAdjustments = mode === 'deposit' 
          ? currentAdjustments + amount
          : currentAdjustments - amount;

        if (mode === 'withdraw' && newAdjustments + account.startingBalance < 0) {
          toast({
            title: "Error",
            description: "Insufficient balance for withdrawal",
            variant: "destructive"
          });
          return;
        }

        // Update manual adjustments and recalculate balance
        const { error } = await supabase
          .from('accounts')
          .update({ 
            manual_adjustments: newAdjustments
          })
          .eq('id', account.id)
          .eq('user_id', user.id);

        if (error) throw error;

        // Recalculate account stats to update current balance
        const { updateAccountStats } = await import('@/utils/accountStatsCalculator');
        await updateAccountStats(account.id, user.id);

        toast({
          title: `${mode === 'deposit' ? 'Deposit' : 'Withdrawal'} Successful`,
          description: `${mode === 'deposit' ? 'Added' : 'Withdrawn'} ${formData.amount} ${mode === 'deposit' ? 'to' : 'from'} your account`,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error(`Error ${mode}ing account:`, error);
      toast({
        title: "Error",
        description: `Failed to ${mode} account. Please try again.`,
        variant: "destructive"
      });
    }
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

  const currencySymbol = getCurrencySymbol(formData.currency || 'USD');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Account' : 
             mode === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update your account information' :
             mode === 'deposit' ? 'Add funds to your account' : 'Remove funds from your account'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {mode === 'edit' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name *</Label>
                  <Input
                    id="name"
                    placeholder="My Trading Account"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Account Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Demo">Demo</SelectItem>
                       <SelectItem value="Live">Live</SelectItem>
                       <SelectItem value="Prop Firm Challenge">Prop Firm Challenge</SelectItem>
                       <SelectItem value="Prop Funded/Live">Prop Funded/Live</SelectItem>
                       <SelectItem value="Backtesting">Backtesting</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="broker">Broker *</Label>
                  <Input
                    id="broker"
                    placeholder="MetaTrader 4/5, etc."
                    value={formData.broker}
                    onChange={(e) => setFormData(prev => ({ ...prev, broker: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startingBalance">Starting Balance ({currencySymbol})</Label>
                  <Input
                    id="startingBalance"
                    type="number"
                    step="0.01"
                    placeholder="10000.00"
                    value={formData.startingBalance}
                    onChange={(e) => setFormData(prev => ({ ...prev, startingBalance: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentBalance">Current Balance ({currencySymbol})</Label>
                  <Input
                    id="currentBalance"
                    type="number"
                    step="0.01"
                    placeholder="10000.00"
                    value={formData.currentBalance}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentBalance: e.target.value }))}
                  />
                </div>
              </div>

              {formData.type === 'Prop Firm Challenge' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="drawdownType">Drawdown Type</Label>
                    <Select value={formData.drawdownType} onValueChange={(value: 'static' | 'trailing') => setFormData(prev => ({ ...prev, drawdownType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select drawdown type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Static</SelectItem>
                        <SelectItem value="trailing">Trailing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dailyDrawdown">Daily Drawdown (%)</Label>
                      <Input
                        id="dailyDrawdown"
                        type="number"
                        step="0.01"
                        placeholder="5.00"
                        value={formData.dailyDrawdown}
                        onChange={(e) => setFormData(prev => ({ ...prev, dailyDrawdown: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxDrawdown">Maximum Drawdown (%)</Label>
                      <Input
                        id="maxDrawdown"
                        type="number"
                        step="0.01"
                        placeholder="10.00"
                        value={formData.maxDrawdown}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxDrawdown: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profitTarget">Profit Target ({currencySymbol})</Label>
                      <Input
                        id="profitTarget"
                        type="number"
                        step="0.01"
                        placeholder="800.00"
                        value={formData.profitTarget}
                        onChange={(e) => setFormData(prev => ({ ...prev, profitTarget: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phase">Phase</Label>
                      <Select value={formData.phase} onValueChange={(value) => setFormData(prev => ({ ...prev, phase: value }))}>
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
                </>
              )}

              {formData.type === 'Prop Funded/Live' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="drawdownType">Drawdown Type</Label>
                    <Select value={formData.drawdownType} onValueChange={(value: 'static' | 'trailing') => setFormData(prev => ({ ...prev, drawdownType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select drawdown type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Static</SelectItem>
                        <SelectItem value="trailing">Trailing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dailyDrawdown">Daily Drawdown (%)</Label>
                      <Input
                        id="dailyDrawdown"
                        type="number"
                        step="0.01"
                        placeholder="5.00"
                        value={formData.dailyDrawdown}
                        onChange={(e) => setFormData(prev => ({ ...prev, dailyDrawdown: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxDrawdown">Maximum Drawdown (%)</Label>
                      <Input
                        id="maxDrawdown"
                        type="number"
                        step="0.01"
                        placeholder="10.00"
                        value={formData.maxDrawdown}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxDrawdown: e.target.value }))}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {currencySymbol}{account?.currentBalance?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Current Balance</div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({currencySymbol})</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {mode === 'edit' ? 'Update Account' : 
             mode === 'deposit' ? 'Deposit' : 'Withdraw'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}