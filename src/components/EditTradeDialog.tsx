import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateForexPipValue } from "@/utils/forexCalculator";
import { updateAccountStats } from "@/utils/accountStatsCalculator";

interface EditTradeDialogProps {
  trade: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTradeUpdated: () => void;
}

export function EditTradeDialog({ trade, open, onOpenChange, onTradeUpdated }: EditTradeDialogProps) {
  const { selectedAccount, reloadAccounts } = useAccount();
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState([]);
  const [editedTrade, setEditedTrade] = useState({
    symbol: "",
    side: "",
    entry_price: "",
    exit_price: "",
    size: "",
    stop_loss: "",
    take_profit: "",
    notes: "",
    playbook: "",
    pnl: "",
    commission: ""
  });

  // Initialize form with trade data
  useEffect(() => {
    if (trade) {
      setEditedTrade({
        symbol: trade.symbol || "",
        side: trade.side || "",
        entry_price: trade.entry_price?.toString() || "",
        exit_price: trade.exit_price?.toString() || "",
        size: trade.size?.toString() || "",
        stop_loss: trade.stop_loss?.toString() || "",
        take_profit: trade.take_profit?.toString() || "",
        notes: trade.notes || "",
        playbook: trade.playbook_id || "",
        pnl: trade.pnl?.toString() || "",
        commission: trade.commission?.toString() || ""
      });
    }
  }, [trade]);

  // Load playbooks
  useEffect(() => {
    if (user && selectedAccount) {
      loadPlaybooks();
    }
  }, [user, selectedAccount]);

  const loadPlaybooks = async () => {
    try {
      const { data, error } = await supabase
        .from('playbooks' as any)
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setPlaybooks(data || []);
    } catch (error) {
      console.error('Error loading playbooks:', error);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!editedTrade.symbol || !editedTrade.side || !editedTrade.entry_price || !editedTrade.size) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!user || !selectedAccount || !trade) {
      toast({
        title: "Error",
        description: "User not authenticated or no trade selected",
        variant: "destructive"
      });
      return;
    }

    try {
      const entryPrice = parseFloat(editedTrade.entry_price);
      const stopLoss = editedTrade.stop_loss ? parseFloat(editedTrade.stop_loss) : null;
      const takeProfit = editedTrade.take_profit ? parseFloat(editedTrade.take_profit) : null;
      const size = parseFloat(editedTrade.size);

      // Calculate forex pip values for non-INR accounts
      const forexCalc = calculateForexPipValue(
        editedTrade.symbol.toUpperCase(),
        entryPrice,
        stopLoss,
        takeProfit,
        size,
        selectedAccount.currency || 'USD'
      );

      const tradeData = {
        symbol: editedTrade.symbol.toUpperCase(),
        side: editedTrade.side,
        entry_price: entryPrice,
        exit_price: editedTrade.exit_price ? parseFloat(editedTrade.exit_price) : null,
        size: size,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        notes: editedTrade.notes || null,
        playbook_id: editedTrade.playbook || null,
        pnl: editedTrade.pnl ? parseFloat(editedTrade.pnl) : null,
        commission: editedTrade.commission ? parseFloat(editedTrade.commission) : 0
      };

      const { error } = await supabase
        .from('trades' as any)
        .update(tradeData)
        .eq('id', trade.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update account stats after trade update
      await updateAccountStats(selectedAccount.id, user.id);
      
      // Reload accounts to refresh the UI
      await reloadAccounts();

      toast({
        title: "Trade Updated",
        description: `Successfully updated ${editedTrade.side} trade for ${editedTrade.symbol}`,
      });

      onTradeUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating trade:', error);
      toast({
        title: "Error",
        description: "Failed to update trade. Please try again.",
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

  if (!selectedAccount || !trade) {
    return null;
  }

  const currencySymbol = getCurrencySymbol(selectedAccount.currency || 'USD');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Trade</DialogTitle>
          <DialogDescription>
            Update trade details for {selectedAccount.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                placeholder="AAPL"
                value={editedTrade.symbol}
                onChange={(e) => setEditedTrade(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="side">Side *</Label>
              <Select value={editedTrade.side} onValueChange={(value) => setEditedTrade(prev => ({ ...prev, side: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Long">Long</SelectItem>
                  <SelectItem value="Short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_price">Entry Price * ({currencySymbol})</Label>
              <Input
                id="entry_price"
                type="number"
                step="0.01"
                placeholder="100.00"
                value={editedTrade.entry_price}
                onChange={(e) => setEditedTrade(prev => ({ ...prev, entry_price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exit_price">Exit Price ({currencySymbol})</Label>
              <Input
                id="exit_price"
                type="number"
                step="0.01"
                placeholder="105.00"
                value={editedTrade.exit_price}
                onChange={(e) => setEditedTrade(prev => ({ ...prev, exit_price: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size *</Label>
              <Input
                id="size"
                type="number"
                placeholder="100"
                value={editedTrade.size}
                onChange={(e) => setEditedTrade(prev => ({ ...prev, size: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stop_loss">Stop Loss ({currencySymbol})</Label>
              <Input
                id="stop_loss"
                type="number"
                step="0.01"
                placeholder="95.00"
                value={editedTrade.stop_loss}
                onChange={(e) => setEditedTrade(prev => ({ ...prev, stop_loss: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="take_profit">Take Profit ({currencySymbol})</Label>
              <Input
                id="take_profit"
                type="number"
                step="0.01"
                placeholder="110.00"
                value={editedTrade.take_profit}
                onChange={(e) => setEditedTrade(prev => ({ ...prev, take_profit: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pnl">P&L ({currencySymbol})</Label>
              <Input
                id="pnl"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={editedTrade.pnl}
                onChange={(e) => setEditedTrade(prev => ({ ...prev, pnl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission">Commission ({currencySymbol})</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                placeholder="2.50"
                value={editedTrade.commission}
                onChange={(e) => setEditedTrade(prev => ({ ...prev, commission: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="playbook">Playbook</Label>
            <Select value={editedTrade.playbook} onValueChange={(value) => setEditedTrade(prev => ({ ...prev, playbook: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select playbook (optional)" />
              </SelectTrigger>
              <SelectContent>
                {playbooks.map((playbook: any) => (
                  <SelectItem key={playbook.id} value={playbook.id.toString()}>
                    {playbook.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Trade notes and analysis..."
              value={editedTrade.notes}
              onChange={(e) => setEditedTrade(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Update Trade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}