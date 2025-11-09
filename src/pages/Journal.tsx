import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccount } from "@/contexts/AccountContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTradeActions } from "@/hooks/useTradeActions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AddTradeDialog } from "@/components/AddTradeDialog";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { TradeDetailsDialog } from "@/components/TradeDetailsDialog";
import { EditTradeDialog } from "@/components/EditTradeDialog";
import { updateAccountStats } from "@/utils/accountStatsCalculator";

export default function Journal() {
  const { selectedAccount, reloadAccounts } = useAccount();
  const { user } = useAuth();
  const { showAddTrade, setShowAddTrade } = useTradeActions();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'wins' | 'losses'>('all');
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [editTrade, setEditTrade] = useState<any>(null);
  const [trades, setTrades] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<any>(null);

  useEffect(() => {
    if (user && selectedAccount) {
      loadTrades();
    }
  }, [user, selectedAccount]);

  // Real-time listener for trades
  useEffect(() => {
    if (!user || !selectedAccount) return;

    const channel = supabase
      .channel('trades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedAccount]);

  const loadTrades = async () => {
    if (!user || !selectedAccount) return;
    
    try {
      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          playbooks(name)
        `)
        .eq('user_id', user.id)
        .eq('account_id', selectedAccount.id.toString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error loading trades:', error);
      toast({
        title: "Error",
        description: "Failed to load trades",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTrade = async () => {
    if (!tradeToDelete) return;

    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeToDelete.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update account stats after trade deletion
      if (selectedAccount && user) {
        await updateAccountStats(selectedAccount.id, user.id);
        await reloadAccounts(); // Reload accounts to update the UI
      }

      toast({
        title: "Trade Deleted",
        description: "Trade has been successfully deleted",
      });

      setDeleteDialogOpen(false);
      setTradeToDelete(null);
      loadTrades();
    } catch (error) {
      console.error('Error deleting trade:', error);
      toast({
        title: "Error",
        description: "Failed to delete trade",
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
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-foreground">No Account Selected</h1>
          <p className="text-muted-foreground">Please select an account to view trades</p>
        </div>
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(selectedAccount.currency);

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trade.playbooks?.name && trade.playbooks.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (trade.notes && trade.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterType === 'wins') {
      return matchesSearch && trade.pnl && trade.pnl > 0;
    } else if (filterType === 'losses') {
      return matchesSearch && trade.pnl && trade.pnl < 0;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">{/* Remove heading section */}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute left-3 top-0 h-full flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            placeholder="Search trades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={(value: 'all' | 'wins' | 'losses') => setFilterType(value)}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            <SelectItem value="wins">Wins Only</SelectItem>
            <SelectItem value="losses">Losses Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>
            Showing {filteredTrades.length} trades
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTrades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No trades found. Start by adding your first trade!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Date</TableHead>
                    <TableHead className="min-w-[80px]">Symbol</TableHead>
                    <TableHead className="min-w-[80px]">Direction</TableHead>
                    <TableHead className="min-w-[70px]">Entry</TableHead>
                    <TableHead className="min-w-[70px]">Exit</TableHead>
                    <TableHead className="min-w-[60px]">Size</TableHead>
                    <TableHead className="min-w-[80px]">P&L</TableHead>
                    <TableHead className="min-w-[100px] hidden sm:table-cell">Playbook</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade: any) => (
                    <TableRow key={trade.id}>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm">
                        {new Date(trade.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{trade.symbol}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {trade.side === "Long" ? (
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive mr-1" />
                          )}
                          <span className={`text-xs sm:text-sm ${trade.side === "Long" ? "text-success" : "text-destructive"}`}>
                            {trade.side}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{currencySymbol}{trade.entry_price?.toFixed(2)}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{trade.exit_price ? `${currencySymbol}${trade.exit_price.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{trade.size}</TableCell>
                      <TableCell>
                        <span className={`text-xs sm:text-sm font-medium ${
                          trade.pnl > 0 ? "text-success" : trade.pnl < 0 ? "text-destructive" : ""
                        }`}>
                          {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}${currencySymbol}${trade.pnl.toFixed(2)}` : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {trade.playbooks?.name ? (
                          <Badge variant="secondary" className="text-xs">{trade.playbooks.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          trade.pnl === null ? "outline" :
                          trade.pnl > 0 ? "secondary" :
                          trade.pnl < 0 ? "secondary" : "secondary"
                        } className={`text-xs ${
                          trade.pnl > 0 ? "bg-success/20 text-success border-success/30" : 
                          trade.pnl < 0 ? "bg-destructive/20 text-destructive border-destructive/30" : ""
                        }`}>
                          {trade.pnl === null ? "Open" :
                           trade.pnl > 0 ? "Win" :
                           trade.pnl < 0 ? "Loss" : "Break Even"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedTrade(trade)} className="h-8 w-8 p-0">
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditTrade(trade)} className="h-8 w-8 p-0">
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setTradeToDelete(trade);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TradeDetailsDialog
        trade={selectedTrade}
        open={!!selectedTrade}
        onOpenChange={(open) => !open && setSelectedTrade(null)}
      />

      <EditTradeDialog
        trade={editTrade}
        open={!!editTrade}
        onOpenChange={(open) => !open && setEditTrade(null)}
        onTradeUpdated={loadTrades}
      />

      <FloatingActionButton
        onClick={() => setShowAddTrade(true)}
        icon={Plus}
        label="Add Trade"
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trade</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trade? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTrade}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddTradeDialog 
        open={showAddTrade} 
        onOpenChange={setShowAddTrade} 
      />
    </div>
  );
}