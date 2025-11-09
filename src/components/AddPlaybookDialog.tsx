import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/contexts/AccountContext";

interface AddPlaybookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPlaybookDialog({ open, onOpenChange }: AddPlaybookDialogProps) {
  const { user } = useAuth();
  const { selectedAccount } = useAccount();
  const [playbook, setPlaybook] = useState({
    name: "",
    description: "",
    entry_rules: "",
    exit_rules: "",
    risk_rules: ""
  });

  const handleSubmit = async () => {
    // Validate required fields
    if (!playbook.name || !playbook.description) {
      toast({
        title: "Error",
        description: "Please fill in playbook name and description",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error", 
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('playbooks' as any)
        .insert([{
          user_id: user.id,
          name: playbook.name,
          description: playbook.description,
          entry_rules: playbook.entry_rules || null,
          exit_rules: playbook.exit_rules || null,
          risk_rules: playbook.risk_rules || null
        }]);

      if (error) throw error;

      toast({
        title: "Playbook Created",
        description: `Successfully created playbook "${playbook.name}"`,
      });

      // Reset form and close dialog
      setPlaybook({
        name: "",
        description: "",
        entry_rules: "",
        exit_rules: "",
        risk_rules: ""
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating playbook:', error);
      toast({
        title: "Error",
        description: "Failed to create playbook. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Playbook</DialogTitle>
          <DialogDescription>
            Document your trading strategy for consistent execution
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Playbook Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Momentum Breakout Strategy"
              value={playbook.name}
              onChange={(e) => setPlaybook(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the strategy..."
              value={playbook.description}
              onChange={(e) => setPlaybook(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry_rules">Entry Rules</Label>
            <Textarea
              id="entry_rules"
              placeholder="Define when to enter a trade..."
              value={playbook.entry_rules}
              onChange={(e) => setPlaybook(prev => ({ ...prev, entry_rules: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exit_rules">Exit Rules</Label>
            <Textarea
              id="exit_rules"
              placeholder="Define when to exit a trade..."
              value={playbook.exit_rules}
              onChange={(e) => setPlaybook(prev => ({ ...prev, exit_rules: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk_rules">Risk Management</Label>
            <Textarea
              id="risk_rules"
              placeholder="Define risk management rules..."
              value={playbook.risk_rules}
              onChange={(e) => setPlaybook(prev => ({ ...prev, risk_rules: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Playbook</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}