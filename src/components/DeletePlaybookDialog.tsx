import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle } from "lucide-react";

interface DeletePlaybookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playbook: any;
  onSuccess: () => void;
}

export function DeletePlaybookDialog({ open, onOpenChange, playbook, onSuccess }: DeletePlaybookDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user || !playbook) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('playbooks' as any)
        .delete()
        .eq('id', playbook.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Strategy deleted successfully",
      });
      
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error deleting playbook:', error);
      toast({
        title: "Error",
        description: "Failed to delete strategy",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete Strategy</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete "{playbook?.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Strategy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}