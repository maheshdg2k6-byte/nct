import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Download, 
  Upload,
  Save,
  Settings as SettingsIcon,
  FileText
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/hooks/use-toast";
import { ImportDialog } from "@/components/ImportDialog";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const { user } = useAuth();
  const { selectedAccount } = useAccount();
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  const [profile, setProfile] = useState({
    name: user?.user_metadata?.name || user?.user_metadata?.display_name || "Trader",
    email: user?.email || "",
    timezone: "America/New_York",
    currency: "USD"
  });

  const [preferences, setPreferences] = useState({
    defaultAccount: "main",
    riskPerTrade: "1",
    theme: "dark",
    dateFormat: "MM/DD/YYYY"
  });

  const handleSaveProfile = () => {
    // In a real app, this would update the user profile via Supabase
    toast({
      title: "Profile Updated",
      description: "Your profile information has been updated successfully.",
    });
  };

  const handleSavePreferences = () => {
    // In a real app, this would save user preferences
    toast({
      title: "Preferences Saved",
      description: "Your trading preferences have been saved successfully.",
    });
  };

  const handleImportTrades = () => {
    if (!selectedAccount) {
      toast({
        title: "No account selected",
        description: "Please select an account first",
        variant: "destructive"
      });
      return;
    }
    setShowImportDialog(true);
  };

  const handleExportData = async () => {
    if (!user || !selectedAccount) {
      toast({
        title: "No account selected",
        description: "Please select an account first",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', selectedAccount.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!trades || trades.length === 0) {
        toast({
          title: "No data to export",
          description: "No trades found for the selected account",
        });
        return;
      }

      // Convert to CSV
      const headers = ['symbol', 'side', 'entry_price', 'exit_price', 'size', 'stop_loss', 'take_profit', 'pnl', 'notes', 'created_at'];
      const csvContent = [
        headers.join(','),
        ...trades.map(trade => headers.map(header => trade[header] || '').join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trades_${selectedAccount.name}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Exported ${trades.length} trades to CSV`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export trading data",
        variant: "destructive"
      });
    }
  };

  const handleExportReport = async () => {
    if (!user || !selectedAccount) {
      toast({
        title: "No account selected", 
        description: "Please select an account first",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select(`
          *,
          playbooks(name)
        `)
        .eq('user_id', user.id)
        .eq('account_id', selectedAccount.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!trades || trades.length === 0) {
        toast({
          title: "No data to export",
          description: "No trades found for the selected account",
        });
        return;
      }

      // Calculate summary statistics
      const completedTrades = trades.filter(t => t.pnl !== null);
      const winningTrades = completedTrades.filter(t => t.pnl > 0);
      const totalPnL = completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0;

      // Create detailed report
      const reportContent = [
        `Trading Report - ${selectedAccount.name}`,
        `Generated: ${new Date().toLocaleString()}`,
        '',
        'SUMMARY STATISTICS',
        `Total Trades: ${trades.length}`,
        `Completed Trades: ${completedTrades.length}`,
        `Win Rate: ${winRate.toFixed(1)}%`,
        `Total P&L: ${totalPnL.toFixed(2)} ${selectedAccount.currency}`,
        `Average Win: ${winningTrades.length > 0 ? (winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length).toFixed(2) : '0.00'}`,
        '',
        'DETAILED TRADES',
        'Symbol,Side,Entry Price,Exit Price,Size,Stop Loss,Take Profit,P&L,Strategy,Date',
        ...trades.map(trade => 
          `${trade.symbol},${trade.side},${trade.entry_price || ''},${trade.exit_price || ''},${trade.size},${trade.stop_loss || ''},${trade.take_profit || ''},${trade.pnl || ''},${trade.playbooks?.name || 'None'},${new Date(trade.created_at).toLocaleString()}`
        )
      ].join('\n');

      // Download file
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading_report_${selectedAccount.name}_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report exported",
        description: `Generated trading report with ${trades.length} trades`,
      });
    } catch (error) {
      console.error('Report export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to generate trading report", 
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <CardDescription>
                Your account information synced with Google
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email is synced with your Google account</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={profile.timezone} onValueChange={(value) => setProfile(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">GMT</SelectItem>
                      <SelectItem value="Europe/Paris">CET</SelectItem>
                      <SelectItem value="Asia/Kolkata">IST</SelectItem>
                      <SelectItem value="Asia/Tokyo">JST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select value={profile.currency} onValueChange={(value) => setProfile(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
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
              </div>
              <Button onClick={handleSaveProfile} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Profile
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Sidebar - Data Management */}
        <div className="space-y-6">
          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Import, export, or manage your trading data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={handleImportTrades}>
                <Upload className="h-4 w-4 mr-2" />
                Import Trades (CSV)
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export All Data
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleExportReport}>
                <FileText className="h-4 w-4 mr-2" />
                Export Trading Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ImportDialog 
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
    </div>
  );
}