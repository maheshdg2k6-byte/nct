import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface Playbook {
  id: string;
  name: string;
  description: string;
  entry_rules: string | null;
  exit_rules: string | null;
  risk_rules: string | null;
  created_at: string;
  updated_at: string;
}

interface StrategyDetailsDialogProps {
  playbook: Playbook | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StrategyDetailsDialog({ playbook, open, onOpenChange }: StrategyDetailsDialogProps) {
  if (!playbook) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{playbook.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {playbook.description || "No description provided"}
              </p>
            </CardContent>
          </Card>

          {/* Strategy Rules */}
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            {/* Entry Rules */}
            <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <CardTitle className="text-lg">Entry Rules</CardTitle>
                </div>
                <CardDescription>When to enter trades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {playbook.entry_rules || "No entry rules defined"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Exit Rules */}
            <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-destructive"></div>
                  <CardTitle className="text-lg">Exit Rules</CardTitle>
                </div>
                <CardDescription>When to exit trades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {playbook.exit_rules || "No exit rules defined"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Risk Management */}
            <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-warning"></div>
                  <CardTitle className="text-lg">Risk Management</CardTitle>
                </div>
                <CardDescription>Risk control measures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {playbook.risk_rules || "No risk management rules defined"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Metadata */}
          <Card className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <CardHeader>
              <CardTitle className="text-lg">Strategy Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Created:</span>
                  <p className="text-sm font-medium">
                    {new Date(playbook.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Last Updated:</span>
                  <p className="text-sm font-medium">
                    {new Date(playbook.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}