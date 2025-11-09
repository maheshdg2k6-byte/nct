import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccount } from "@/contexts/AccountContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { calculateForexPipValue } from "@/utils/forexCalculator";
import { updateAccountStats } from "@/utils/accountStatsCalculator";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Common TradingView symbols
const TRADING_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF",
  "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "CHFJPY", "EURCHF", "EURAUD",
  "XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD",
  "US30", "US100", "US500", "UK100", "GER40", "FRA40", "JPN225",
  "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA"
];

interface AddTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTradeDialog({ open, onOpenChange }: AddTradeDialogProps) {
  const { selectedAccount, reloadAccounts } = useAccount();
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [size, setSize] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [pnl, setPnl] = useState("");
  const [commission, setCommission] = useState("");
  const [exitType, setExitType] = useState("");
  const [playbookId, setPlaybookId] = useState("");
  const [mistake, setMistake] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeDate, setTradeDate] = useState<Date>(new Date());
  const [initialR2R, setInitialR2R] = useState("");
  const [actualR2R, setActualR2R] = useState("");

  // Load playbooks when dialog opens
  useEffect(() => {
    if (open && user && selectedAccount) {
      loadPlaybooks();
    }
  }, [open, user, selectedAccount]);

  const loadPlaybooks = async () => {
    if (!user || !selectedAccount) return;

    try {
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setPlaybooks(data || []);
    } catch (error) {
      console.error('Error loading playbooks:', error);
      setPlaybooks([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAccount || !user) {
      toast({
        title: "Error",
        description: "No account selected or user not found",
        variant: "destructive"
      });
      return;
    }

    if (!symbol || !side || !entryPrice || !size) {
      toast({
        title: "Error",
        description: "Please fill in required fields (Symbol, Side, Entry Price, Size)",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          account_id: selectedAccount.id,
          symbol: symbol,
          side: side,
          entry_price: parseFloat(entryPrice),
          exit_price: exitPrice ? parseFloat(exitPrice) : null,
          size: parseFloat(size),
          stop_loss: stopLoss ? parseFloat(stopLoss) : null,
          take_profit: takeProfit ? parseFloat(takeProfit) : null,
          pnl: pnl ? parseFloat(pnl) : null,
          playbook_id: playbookId || null,
          notes: notes || null,
          created_at: tradeDate.toISOString(),
          commission: commission ? parseFloat(commission) : 0,
          exit_type: exitType || null,
          initial_r2r: initialR2R ? parseFloat(initialR2R) : null,
          actual_r2r: actualR2R ? parseFloat(actualR2R) : null,
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Update account stats
      await updateAccountStats(selectedAccount.id, user.id);
      
      // Reload accounts to refresh the UI
      await reloadAccounts();

      toast({
        title: "Success",
        description: "Trade added successfully",
      });

      // Reset form
      setSymbol("");
      setSide("");
      setEntryPrice("");
      setExitPrice("");
      setSize("");
      setStopLoss("");
      setTakeProfit("");
      setPnl("");
      setCommission("");
      setExitType("");
      setPlaybookId("");
      setMistake("");
      setNotes("");
      setTradeDate(new Date());
      setInitialR2R("");
      setActualR2R("");
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding trade:', error);
      toast({
        title: "Error",
        description: "Failed to add trade. Please try again.",
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

  if (!selectedAccount) {
    return null;
  }

  const currencySymbol = getCurrencySymbol(selectedAccount.currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Trade</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                type="text"
                placeholder="Type symbol (e.g. EURUSD, AAPL, BTCUSD)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                list="symbol-suggestions"
              />
              <datalist id="symbol-suggestions">
                {TRADING_SYMBOLS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="side">Side *</Label>
              <Select value={side} onValueChange={setSide}>
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
              <Label htmlFor="entry-price">Entry Price *</Label>
              <Input
                id="entry-price"
                type="number"
                step="any"
                placeholder="1.0850"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exit-price">Exit Price</Label>
              <Input
                id="exit-price"
                type="number"
                step="any"
                placeholder="1.0920"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size *</Label>
              <Input
                id="size"
                type="number"
                step="any"
                placeholder="0.1"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stop-loss">Stop Loss</Label>
              <Input
                id="stop-loss"
                type="number"
                step="any"
                placeholder="1.0800"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="take-profit">Take Profit</Label>
              <Input
                id="take-profit"
                type="number"
                step="any"
                placeholder="1.0950"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pnl">P&L ({currencySymbol})</Label>
              <Input
                id="pnl"
                type="number"
                step="any"
                placeholder="100.00"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commission">Commission ({currencySymbol})</Label>
              <Input
                id="commission"
                type="number"
                step="any"
                placeholder="2.50"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-date">Trade Date</Label>
              <div className="border border-input rounded-md p-2">
                <DatePicker
                  selected={tradeDate}
                  onChange={(date: Date | null) => date && setTradeDate(date)}
                  dateFormat="yyyy-MM-dd"
                  className="w-full bg-transparent outline-none text-sm"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  maxDate={new Date()}
                  placeholderText="Select trade date"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initial-r2r">Initial R:R Ratio</Label>
              <Input
                id="initial-r2r"
                type="number"
                step="any"
                placeholder="2.5"
                value={initialR2R}
                onChange={(e) => setInitialR2R(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Planned risk-to-reward ratio</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual-r2r">Actual R:R Ratio</Label>
              <Input
                id="actual-r2r"
                type="number"
                step="any"
                placeholder="2.0"
                value={actualR2R}
                onChange={(e) => setActualR2R(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Achieved risk-to-reward ratio</p>
            </div>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exit-type">Exit Type</Label>
              <Select value={exitType} onValueChange={setExitType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Take Profit">Take Profit</SelectItem>
                  <SelectItem value="Stop Loss">Stop Loss</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Breakeven">Breakeven</SelectItem>
                  <SelectItem value="Trailing Stop">Trailing Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="playbook">Playbook</Label>
              <Select value={playbookId} onValueChange={setPlaybookId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select playbook" />
                </SelectTrigger>
                <SelectContent>
                  {playbooks.map((playbook) => (
                    <SelectItem key={playbook.id} value={playbook.id}>
                      {playbook.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mistake">Mistake</Label>
            <Select value={mistake} onValueChange={setMistake}>
              <SelectTrigger>
                <SelectValue placeholder="Select mistake (if any)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="FOMO">FOMO (Fear of Missing Out)</SelectItem>
                <SelectItem value="Revenge Trading">Revenge Trading</SelectItem>
                <SelectItem value="Overleveraging">Overleveraging</SelectItem>
                <SelectItem value="No Stop Loss">No Stop Loss</SelectItem>
                <SelectItem value="Moving Stop Loss">Moving Stop Loss</SelectItem>
                <SelectItem value="Early Exit">Early Exit</SelectItem>
                <SelectItem value="Late Entry">Late Entry</SelectItem>
                <SelectItem value="Against Plan">Against Trading Plan</SelectItem>
                <SelectItem value="Emotional">Emotional Decision</SelectItem>
                <SelectItem value="News Trading">News Trading</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this trade..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add Trade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}