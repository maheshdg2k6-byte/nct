import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface EditPlaybookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playbook: any;
  onSuccess: () => void;
}

export function EditPlaybookDialog({ open, onOpenChange, playbook, onSuccess }: EditPlaybookDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    entry_rules: "",
    exit_rules: "", 
    risk_rules: ""
  });
  const [loading, setLoading] = useState(false);

  // Update form data when playbook changes
  useEffect(() => {
    if (playbook) {
      setFormData({
        name: playbook.name || "",
        description: playbook.description || "",
        entry_rules: playbook.entry_rules || "",
        exit_rules: playbook.exit_rules || "",
        risk_rules: playbook.risk_rules || ""
      });
    }
  }, [playbook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !playbook) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('playbooks' as any)
        .update({
          name: formData.name.trim(),
          description: formData.description.trim(),
          entry_rules: formData.entry_rules.trim(),
          exit_rules: formData.exit_rules.trim(),
          risk_rules: formData.risk_rules.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', playbook.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Strategy updated successfully",
      });
      
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating playbook:', error);
      toast({
        title: "Error",
        description: "Failed to update strategy",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Strategy</DialogTitle>
          <DialogDescription>
            Update your trading strategy details
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Strategy Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter strategy name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your trading strategy"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry_rules">Entry Rules</Label>
            <Textarea
              id="entry_rules"
              value={formData.entry_rules}
              onChange={(e) => setFormData(prev => ({ ...prev, entry_rules: e.target.value }))}
              placeholder="Define your entry criteria"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exit_rules">Exit Rules</Label>
            <Textarea
              id="exit_rules"
              value={formData.exit_rules}
              onChange={(e) => setFormData(prev => ({ ...prev, exit_rules: e.target.value }))}
              placeholder="Define your exit criteria"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk_rules">Risk Management</Label>
            <Textarea
              id="risk_rules"
              value={formData.risk_rules}
              onChange={(e) => setFormData(prev => ({ ...prev, risk_rules: e.target.value }))}
              placeholder="Define risk management rules"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Strategy"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}