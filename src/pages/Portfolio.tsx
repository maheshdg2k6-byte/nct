import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Share2, Plus, ExternalLink, Copy, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/contexts/AccountContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Portfolio {
  id: string;
  name: string;
  description: string;
  bio: string;
  is_public: boolean;
  share_token: string;
  share_trades: boolean;
  share_analytics: boolean;
  share_calendar: boolean;
  share_playbooks: boolean;
  max_shared_trades: number;
  focus_learnings: boolean;
  account_id: string | null;
}

export default function Portfolio() {
  const { user } = useAuth();
  const { accounts } = useAccount();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTradeSelectDialog, setShowTradeSelectDialog] = useState(false);
  const [availableTrades, setAvailableTrades] = useState<any[]>([]);
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [shareTrades, setShareTrades] = useState(true);
  const [shareAnalytics, setShareAnalytics] = useState(true);
  const [shareCalendar, setShareCalendar] = useState(false);
  const [sharePlaybooks, setSharePlaybooks] = useState(false);
  const [maxSharedTrades, setMaxSharedTrades] = useState(10);
  const [focusLearnings, setFocusLearnings] = useState(true);
  const [accountId, setAccountId] = useState<string>("");

  useEffect(() => {
    if (user) {
      loadPortfolios();
    }
  }, [user]);

  const loadPortfolios = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setPortfolios(data || []);
    } catch (error) {
      console.error('Error loading portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!user || !name || !accountId) {
      toast({
        title: "Error",
        description: "Please enter a portfolio name and select an account",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: portfolio, error: insertError } = await supabase
        .from('portfolios')
        .insert({
          user_id: user.id,
          name,
          description,
          bio,
          is_public: isPublic,
          share_trades: shareTrades,
          share_analytics: shareAnalytics,
          share_calendar: shareCalendar,
          share_playbooks: sharePlaybooks,
          max_shared_trades: maxSharedTrades,
          focus_learnings: focusLearnings,
          account_id: accountId
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If trades are being shared, open trade selection dialog
      if (shareTrades && portfolio) {
        setSelectedPortfolio(portfolio);
        const { data: trades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('account_id', accountId)
          .order('created_at', { ascending: false });

        setAvailableTrades(trades || []);
        setSelectedTrades(new Set());
        setShowCreateDialog(false);
        setShowTradeSelectDialog(true);
        resetForm();
      } else {
        toast({
          title: "Success",
          description: "Portfolio created successfully"
        });
        resetForm();
        setShowCreateDialog(false);
        loadPortfolios();
      }
    } catch (error) {
      console.error('Error creating portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to create portfolio",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setBio("");
    setIsPublic(false);
    setShareTrades(true);
    setShareAnalytics(true);
    setShareCalendar(false);
    setSharePlaybooks(false);
    setMaxSharedTrades(10);
    setFocusLearnings(true);
    setAccountId("");
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/shared-portfolio/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Share link copied to clipboard"
    });
  };

  const handleEditPortfolio = async () => {
    if (!selectedPortfolio || !user || !accountId) return;

    try {
      const { error } = await supabase
        .from('portfolios')
        .update({
          name,
          description,
          bio,
          is_public: isPublic,
          share_trades: shareTrades,
          share_analytics: shareAnalytics,
          share_calendar: shareCalendar,
          share_playbooks: sharePlaybooks,
          max_shared_trades: maxSharedTrades,
          focus_learnings: focusLearnings,
          account_id: accountId
        })
        .eq('id', selectedPortfolio.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portfolio updated successfully"
      });

      resetForm();
      setShowEditDialog(false);
      setSelectedPortfolio(null);
      loadPortfolios();
    } catch (error) {
      console.error('Error updating portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to update portfolio",
        variant: "destructive"
      });
    }
  };

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolio || !user) return;

    try {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', selectedPortfolio.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portfolio deleted successfully"
      });

      setShowDeleteDialog(false);
      setSelectedPortfolio(null);
      loadPortfolios();
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to delete portfolio",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
    setName(portfolio.name);
    setDescription(portfolio.description || "");
    setBio(portfolio.bio || "");
    setIsPublic(portfolio.is_public);
    setShareTrades(portfolio.share_trades);
    setShareAnalytics(portfolio.share_analytics);
    setShareCalendar(portfolio.share_calendar);
    setSharePlaybooks(portfolio.share_playbooks);
    setMaxSharedTrades(portfolio.max_shared_trades);
    setFocusLearnings(portfolio.focus_learnings);
    setAccountId(portfolio.account_id || "");
    setShowEditDialog(true);
  };

  const openTradeSelectDialog = async (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
    try {
      // Load trades for this portfolio's account
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user!.id)
        .eq('account_id', portfolio.account_id!)
        .order('created_at', { ascending: false });

      setAvailableTrades(trades || []);

      // Load currently selected trades
      const { data: portfolioTrades } = await supabase
        .from('portfolio_trades')
        .select('trade_id')
        .eq('portfolio_id', portfolio.id);

      setSelectedTrades(new Set(portfolioTrades?.map(pt => pt.trade_id) || []));
      setShowTradeSelectDialog(true);
    } catch (error) {
      console.error('Error loading trades:', error);
      toast({
        title: "Error",
        description: "Failed to load trades",
        variant: "destructive"
      });
    }
  };

  const handleSaveSelectedTrades = async () => {
    if (!selectedPortfolio) return;

    try {
      // Delete existing selections
      await supabase
        .from('portfolio_trades')
        .delete()
        .eq('portfolio_id', selectedPortfolio.id);

      // Insert new selections
      if (selectedTrades.size > 0) {
        const inserts = Array.from(selectedTrades).map(trade_id => ({
          portfolio_id: selectedPortfolio.id,
          trade_id
        }));

        const { error } = await supabase
          .from('portfolio_trades')
          .insert(inserts);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Trade selection updated"
      });

      setShowTradeSelectDialog(false);
      setSelectedPortfolio(null);
      setSelectedTrades(new Set());
    } catch (error) {
      console.error('Error saving trades:', error);
      toast({
        title: "Error",
        description: "Failed to save trade selection",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trading Portfolios</h1>
          <p className="text-muted-foreground mt-2">
            Create and share your trading journey with others
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Portfolio
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading portfolios...
          </CardContent>
        </Card>
      ) : portfolios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Portfolios Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first portfolio to start sharing your trading journey
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => (
            <Card key={portfolio.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{portfolio.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {portfolio.description}
                    </CardDescription>
                  </div>
                  <Badge variant={portfolio.is_public ? "default" : "secondary"}>
                    {portfolio.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Sharing:</p>
                  <div className="flex flex-wrap gap-2">
                    {portfolio.share_trades && <Badge variant="outline">Trades</Badge>}
                    {portfolio.share_analytics && <Badge variant="outline">Analytics</Badge>}
                    {portfolio.share_calendar && <Badge variant="outline">Calendar</Badge>}
                    {portfolio.share_playbooks && <Badge variant="outline">Playbooks</Badge>}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => copyShareLink(portfolio.share_token)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/shared-portfolio/${portfolio.share_token}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openTradeSelectDialog(portfolio)}
                    >
                      Select Trades
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(portfolio)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedPortfolio(portfolio);
                        setShowDeleteDialog(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Portfolio Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Portfolio</DialogTitle>
            <DialogDescription>
              Share your trading journey with others in an educational format
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account">Account *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Portfolio Name *</Label>
              <Input
                id="name"
                placeholder="My Trading Journey"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Input
                id="description"
                placeholder="Learning forex trading..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell others about your trading journey, goals, and what they can learn..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Portfolio</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this portfolio discoverable
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Focus on Learnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Emphasize mistakes and lessons over P&L
                  </p>
                </div>
                <Switch checked={focusLearnings} onCheckedChange={setFocusLearnings} />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Share Settings</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="share-trades" className="font-normal">Share Trades</Label>
                  <Switch
                    id="share-trades"
                    checked={shareTrades}
                    onCheckedChange={setShareTrades}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="share-analytics" className="font-normal">Share Analytics</Label>
                  <Switch
                    id="share-analytics"
                    checked={shareAnalytics}
                    onCheckedChange={setShareAnalytics}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="share-calendar" className="font-normal">Share Calendar</Label>
                  <Switch
                    id="share-calendar"
                    checked={shareCalendar}
                    onCheckedChange={setShareCalendar}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="share-playbooks" className="font-normal">Share Playbooks</Label>
                  <Switch
                    id="share-playbooks"
                    checked={sharePlaybooks}
                    onCheckedChange={setSharePlaybooks}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-trades">Maximum Trades to Share</Label>
              <Input
                id="max-trades"
                type="number"
                min="1"
                max="1000"
                value={maxSharedTrades}
                onChange={(e) => setMaxSharedTrades(parseInt(e.target.value) || 10)}
              />
              <p className="text-sm text-muted-foreground">
                Limit how many of your recent trades are visible
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreatePortfolio}>Create Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Portfolio Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Portfolio</DialogTitle>
            <DialogDescription>
              Update your portfolio settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-account">Account *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Portfolio Name *</Label>
              <Input
                id="edit-name"
                placeholder="My Trading Journey"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Short Description</Label>
              <Input
                id="edit-description"
                placeholder="Learning forex trading..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                placeholder="Tell others about your trading journey, goals, and what they can learn..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Portfolio</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this portfolio discoverable
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Focus on Learnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Emphasize mistakes and lessons over P&L
                  </p>
                </div>
                <Switch checked={focusLearnings} onCheckedChange={setFocusLearnings} />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Share Settings</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-share-trades" className="font-normal">Share Trades</Label>
                  <Switch
                    id="edit-share-trades"
                    checked={shareTrades}
                    onCheckedChange={setShareTrades}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-share-analytics" className="font-normal">Share Analytics</Label>
                  <Switch
                    id="edit-share-analytics"
                    checked={shareAnalytics}
                    onCheckedChange={setShareAnalytics}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-share-calendar" className="font-normal">Share Calendar</Label>
                  <Switch
                    id="edit-share-calendar"
                    checked={shareCalendar}
                    onCheckedChange={setShareCalendar}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-share-playbooks" className="font-normal">Share Playbooks</Label>
                  <Switch
                    id="edit-share-playbooks"
                    checked={sharePlaybooks}
                    onCheckedChange={setSharePlaybooks}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-max-trades">Maximum Trades to Share</Label>
              <Input
                id="edit-max-trades"
                type="number"
                min="1"
                max="1000"
                value={maxSharedTrades}
                onChange={(e) => setMaxSharedTrades(parseInt(e.target.value) || 10)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setSelectedPortfolio(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditPortfolio}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Portfolio</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this portfolio? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePortfolio}>Delete Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trade Selection Dialog */}
      <Dialog open={showTradeSelectDialog} onOpenChange={setShowTradeSelectDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Trades to Share</DialogTitle>
            <DialogDescription>
              Choose which trades you want to include in this portfolio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {availableTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedTrades.has(trade.id)}
                  onCheckedChange={(checked) => {
                    const newSet = new Set(selectedTrades);
                    if (checked) {
                      newSet.add(trade.id);
                    } else {
                      newSet.delete(trade.id);
                    }
                    setSelectedTrades(newSet);
                  }}
                />
                <div className="flex-1 grid grid-cols-4 gap-2">
                  <div>
                    <Badge variant="outline">{trade.symbol}</Badge>
                    <Badge variant={trade.side === "Long" ? "default" : "secondary"} className="ml-2">
                      {trade.side}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    {new Date(trade.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    Entry: {Number(trade.entry_price).toFixed(5)}
                  </div>
                  <div className={`text-sm font-medium ${trade.pnl && Number(trade.pnl) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {trade.pnl ? `${Number(trade.pnl) >= 0 ? '+' : ''}$${Number(trade.pnl).toFixed(2)}` : 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTradeSelectDialog(false);
              setSelectedPortfolio(null);
              setSelectedTrades(new Set());
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveSelectedTrades}>
              Save Selection ({selectedTrades.size} trades)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
