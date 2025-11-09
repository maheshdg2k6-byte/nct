import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/contexts/AccountContext";
import { supabase } from "@/integrations/supabase/client";
import { updateAccountStats } from "@/utils/accountStatsCalculator";
import { Upload } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { user } = useAuth();
  const { selectedAccount } = useAccount();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], trades: [] };
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const trades = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim());
      const trade: any = {};

      headers.forEach((header, index) => {
        const value = values[index];
        if (value) {
          trade[header] = value;
        }
      });

      trades.push(trade);
    }

    return { headers, trades };
  };

  const parseJSON = (text: string) => {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]).map(h => h.toLowerCase());
        return { headers, trades: data };
      }
    } catch (e) {}
    return { headers: [], trades: [] };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !selectedAccount) return;

    setLoading(true);
    try {
      const text = await file.text();
      let parsedData: { headers: string[], trades: any[] };

      // Parse based on file type
      if (file.name.endsWith('.json')) {
        parsedData = parseJSON(text);
      } else {
        // Default to CSV parsing for any other format
        parsedData = parseCSV(text);
      }

      const { headers, trades: rawTrades } = parsedData;

      if (rawTrades.length === 0) {
        toast({
          title: "No data found",
          description: "The file appears to be empty",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Transform trades - accept any format
      const trades = rawTrades.map(rawTrade => {
        const trade: any = {
          user_id: user.id,
          account_id: selectedAccount.id,
          symbol: rawTrade.symbol || 'UNKNOWN',
          side: rawTrade.side || 'Long',
          entry_price: parseFloat(rawTrade.entry_price || rawTrade.entry || '0') || 0,
          size: parseFloat(rawTrade.size || rawTrade.lot || rawTrade.volume || '1') || 1,
        };

        if (rawTrade.exit_price || rawTrade.exit) trade.exit_price = parseFloat(rawTrade.exit_price || rawTrade.exit);
        if (rawTrade.stop_loss || rawTrade.sl) trade.stop_loss = parseFloat(rawTrade.stop_loss || rawTrade.sl);
        if (rawTrade.take_profit || rawTrade.tp) trade.take_profit = parseFloat(rawTrade.take_profit || rawTrade.tp);
        if (rawTrade.pnl || rawTrade.profit) trade.pnl = parseFloat(rawTrade.pnl || rawTrade.profit);
        if (rawTrade.commission || rawTrade.fee) trade.commission = parseFloat(rawTrade.commission || rawTrade.fee);
        if (rawTrade.notes || rawTrade.comment) trade.notes = rawTrade.notes || rawTrade.comment;
        if (rawTrade.exit_type) trade.exit_type = rawTrade.exit_type;
        if (rawTrade.initial_r2r) trade.initial_r2r = parseFloat(rawTrade.initial_r2r);
        if (rawTrade.actual_r2r) trade.actual_r2r = parseFloat(rawTrade.actual_r2r);

        return trade;
      }).filter(t => t.entry_price > 0);

      if (trades.length === 0) {
        toast({
          title: "No valid trades found",
          description: "Please check your file format",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('trades')
        .insert(trades);

      if (error) throw error;

      await updateAccountStats(selectedAccount.id, user.id);

      toast({
        title: "Import successful",
        description: `Imported ${trades.length} trades successfully`,
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error importing trades:', error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import trades. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Trades</DialogTitle>
          <DialogDescription>
            Upload CSV, JSON, XLSX, or TXT file to import trades. Required: symbol, side, entry_price, size
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,.xlsx,.xls,.json,.txt"
              onChange={handleFileUpload}
              disabled={loading}
              ref={fileInputRef}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">File Upload:</p>
            <p className="text-xs">Upload any CSV, JSON, XLSX, or TXT file with trade data. The system will automatically detect columns and import your trades.</p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={loading}>
              <Upload className="h-4 w-4 mr-2" />
              {loading ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}