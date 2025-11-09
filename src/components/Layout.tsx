import { useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart3, Menu, Wallet, Sun, Moon, Monitor, LogOut } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAccount } from "@/contexts/AccountContext";
import { useAuth } from "@/contexts/AuthContext";
import { NewSidebar } from "@/components/NewSidebar";
interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}
export function Layout({
  children,
  title
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const {
    accounts,
    selectedAccount,
    setSelectedAccount,
    loading
  } = useAccount();
  const {
    user,
    signOut
  } = useAuth();
  const {
    theme,
    setTheme
  } = useTheme();
  const location = useLocation();
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };
  const getPageTitle = () => {
    if (title) return title;
    const pathToTitle: Record<string, string> = {
      '/': 'Dashboard',
      '/journal': 'Trading Journal',
      '/analytics': 'Analytics',
      '/calendar': 'Calendar',
      '/playbooks': 'Strategies',
      '/accounts': 'Accounts',
      '/settings': 'Settings'
    };
    return pathToTitle[location.pathname] || 'NCT Journal';
  };
  return <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <NewSidebar collapsed={false} onToggle={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar - Fixed */}
        <div className="hidden lg:block fixed left-0 top-0 h-full z-30">
          <NewSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        </div>

        {/* Main Content */}
        <div className={cn("flex-1 flex flex-col transition-all duration-300", {
        "lg:ml-20": sidebarCollapsed,
        "lg:ml-64": !sidebarCollapsed
      })}>
          {/* Header - Fixed */}
          <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-sm border-b border-border/50 px-4 lg:px-6 h-16 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold text-foreground">{getPageTitle()}</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Account selector */}
              <div className="flex items-center gap-x-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground hidden sm:block">Account:</span>
              </div>
              <Select value={selectedAccount?.id || ""} onValueChange={value => {
              const account = accounts.find(acc => acc.id === value);
              if (account) setSelectedAccount(account);
            }}>
                <SelectTrigger className="w-48 sm:w-64">
                  <SelectValue>
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{selectedAccount?.name || 'Select account'}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {selectedAccount?.currency === 'USD' ? '$' : selectedAccount?.currency === 'EUR' ? '€' : selectedAccount?.currency === 'GBP' ? '£' : selectedAccount?.currency === 'JPY' ? '¥' : selectedAccount?.currency === 'INR' ? '₹' : '$'}{selectedAccount?.currentBalance?.toLocaleString?.()}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" side="bottom">
                  {loading ? <SelectItem value="loading" disabled>Loading accounts...</SelectItem> : accounts.length === 0 ? <SelectItem value="no-accounts" disabled>No accounts available</SelectItem> : accounts.map(account => <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{account.name}</span>
                          <span className="text-xs text-muted-foreground ml-4">
                            {account.currency === 'USD' ? '$' : account.currency === 'EUR' ? '€' : account.currency === 'GBP' ? '£' : account.currency === 'JPY' ? '¥' : account.currency === 'INR' ? '₹' : '$'}{account.currentBalance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-x-2 mt-1">
                          <span className="text-xs text-muted-foreground">{account.broker}</span>
                          <span className={`text-xs ${account.totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {account.totalPnL >= 0 ? '+' : ''}{account.currency === 'USD' ? '$' : account.currency === 'EUR' ? '€' : account.currency === 'GBP' ? '£' : account.currency === 'JPY' ? '¥' : account.currency === 'INR' ? '₹' : '$'}{account.totalPnL.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </SelectItem>)}
                </SelectContent>
              </Select>

              {/* Theme Toggle & User Menu */}
              <div className="flex items-center space-x-2">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover-scale">
                      {theme === "light" ? <Sun className="h-4 w-4" /> : theme === "dark" ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom" sideOffset={4} alignOffset={0}>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="mr-2 h-4 w-4" />
                      Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="mr-2 h-4 w-4" />
                      Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Monitor className="mr-2 h-4 w-4" />
                      System
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Avatar & Dropdown */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" side="bottom" sideOffset={4} alignOffset={0} forceMount>
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none">{user?.user_metadata?.name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>;
}