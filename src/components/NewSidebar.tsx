import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  BookOpen, 
  Calendar, 
  Home, 
  PieChart, 
  Settings, 
  TrendingUp,
  User,
  ChevronLeft,
  ChevronRight,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Journal", href: "/journal", icon: BookOpen },
  { name: "Analytics", href: "/analytics", icon: PieChart },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Strategies", href: "/playbooks", icon: TrendingUp },
  { name: "Portfolio", href: "/portfolio", icon: Share2 },
  { name: "Accounts", href: "/accounts", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface NewSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function NewSidebar({ collapsed, onToggle }: NewSidebarProps) {
  const location = useLocation();

  return (
    <div
      className={cn(
        "relative h-full bg-card/80 backdrop-blur-sm border-r border-border/50 transition-all duration-300 ease-in-out flex flex-col shadow-lg",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        {!collapsed && (
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-primary" />
            <span className="ml-3 text-xl font-bold text-foreground">NCT Journal</span>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        )}
      </div>
      
      {/* Top edge toggle */}
      <Button
        variant="secondary"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-6 h-8 w-8 rounded-full border border-border bg-card text-foreground shadow-lg hover:bg-accent hover:shadow-xl transition-all duration-200 z-10"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium group",
                  collapsed ? "justify-center mx-2 px-2 w-12 h-12" : "",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted/30"
                )}
               title={collapsed ? item.name : ""}
             >
                <Icon className={cn(
                  "transition-all duration-200 flex-shrink-0",
                  collapsed ? "h-5 w-5" : "h-5 w-5 mr-3",
                  isActive ? "text-primary-foreground" : "text-foreground group-hover:scale-110"
                )} />
               {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className={cn(
          "text-xs text-muted-foreground",
          collapsed ? "text-center" : ""
        )}>
          {collapsed ? "© 2024" : "© 2024 NCT Journal"}
        </div>
      </div>
    </div>
  );
}