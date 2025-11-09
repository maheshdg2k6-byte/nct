import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Trade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  size: number;
  pnl: number | null;
  entry_time: string;
  notes: string | null;
  tags: string[] | null;
  mistakes: string[] | null;
  exit_type: string | null;
  account: {
    currency: string;
  };
}

interface TradeDetailsDialogProps {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TradeDetailsDialog({ trade, open, onOpenChange }: TradeDetailsDialogProps) {
  if (!trade) return null;

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'INR': '₹'
    };
    return symbols[currency] || '$';
  };

  const currencySymbol = getCurrencySymbol(trade.account?.currency || 'USD');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{trade.symbol}</span>
            <Badge variant={trade.side === 'long' ? 'default' : 'destructive'}>
              {trade.side.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trade Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Entry Price</h4>
              <p className="text-lg font-semibold">{currencySymbol}{trade.entry_price.toLocaleString()}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Exit Price</h4>
              <p className="text-lg font-semibold">
                {trade.exit_price ? `${currencySymbol}${trade.exit_price.toLocaleString()}` : 'Open'}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Size</h4>
              <p className="text-lg font-semibold">{trade.size}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">P&L</h4>
              <p className={`text-lg font-semibold ${
                trade.pnl && trade.pnl >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {trade.pnl ? `${currencySymbol}${trade.pnl.toLocaleString()}` : 'Open'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Risk Management */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Risk Management</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Stop Loss:</span>
                <p className="font-medium">
                  {trade.stop_loss ? `${currencySymbol}${trade.stop_loss.toLocaleString()}` : 'Not set'}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Take Profit:</span>
                <p className="font-medium">
                  {trade.take_profit ? `${currencySymbol}${trade.take_profit.toLocaleString()}` : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Exit Type */}
          {trade.exit_type && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Exit Type</h4>
                <Badge variant="outline">{trade.exit_type}</Badge>
              </div>
            </>
          )}

          {/* Tags */}
          {trade.tags && trade.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {trade.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Mistakes */}
          {trade.mistakes && trade.mistakes.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Mistakes</h4>
                <div className="flex flex-wrap gap-2">
                  {trade.mistakes.map((mistake, index) => (
                    <Badge key={index} variant="destructive">{mistake}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {trade.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                <p className="text-sm text-foreground bg-muted p-3 rounded-md">
                  {trade.notes}
                </p>
              </div>
            </>
          )}

          {/* Trade Date */}
          <Separator />
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Entry Date</h4>
            <p className="font-medium">{new Date(trade.entry_time).toLocaleDateString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}