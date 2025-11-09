import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus,
  Search,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { AddPlaybookDialog } from "@/components/AddPlaybookDialog";
import { EditPlaybookDialog } from "@/components/EditPlaybookDialog";
import { DeletePlaybookDialog } from "@/components/DeletePlaybookDialog";
import { StrategyDetailsDialog } from "@/components/StrategyDetailsDialog";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Strategies() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddPlaybook, setShowAddPlaybook] = useState(false);
  const [showEditPlaybook, setShowEditPlaybook] = useState(false);
  const [showDeletePlaybook, setShowDeletePlaybook] = useState(false);
  const [showStrategyDetails, setShowStrategyDetails] = useState(false);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null);
  const [editingPlaybook, setEditingPlaybook] = useState<any>(null);
  const [deletingPlaybook, setDeletingPlaybook] = useState<any>(null);
  const [viewingPlaybook, setViewingPlaybook] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) loadPlaybooks();
  }, [user]);

  const loadPlaybooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPlaybooks(data || []);
    } catch (err) {
      console.error('Error loading playbooks', err);
      toast({ title: 'Error', description: 'Failed to load strategies', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (playbook: any) => {
    setEditingPlaybook(playbook);
    setShowEditPlaybook(true);
  };

  const handleDelete = (playbook: any) => {
    setDeletingPlaybook(playbook);
    setShowDeletePlaybook(true);
  };

  const handleViewDetails = (playbook: any) => {
    setViewingPlaybook(playbook);
    setShowStrategyDetails(true);
  };

  const handleRemoveAllStrategies = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete ALL your strategies. This action cannot be undone. Are you absolutely sure?')) return;
    try {
      setLoading(true);
      // Remove all playbooks
      const { error } = await supabase
        .from('playbooks')
        .delete()
        .eq('user_id', user?.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'All strategies have been removed' });
      setPlaybooks([]);
    } catch (err) {
      console.error('Clear error', err);
      toast({ title: 'Error', description: 'Failed to remove all strategies', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = playbooks.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute left-3 top-0 h-full flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            placeholder="Search strategies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="destructive" onClick={handleRemoveAllStrategies} disabled={loading}>
          Remove All
        </Button>
      </div>

      {selectedPlaybook ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setSelectedPlaybook(null)}>
              ← Back to Strategies
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => handleEdit(selectedPlaybook)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => handleDelete(selectedPlaybook.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{selectedPlaybook.name}</CardTitle>
                <CardDescription>{selectedPlaybook.description || 'No description provided'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Strategy Details</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm mb-2"><strong>Created:</strong> {new Date(selectedPlaybook.created_at).toLocaleDateString()}</p>
                    <p className="text-sm mb-2"><strong>Last Updated:</strong> {new Date(selectedPlaybook.updated_at).toLocaleDateString()}</p>
                    <p className="text-sm"><strong>Description:</strong> {selectedPlaybook.description || 'No description available'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Strategy Performance</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Performance tracking will be available soon.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((playbook) => (
            <Card key={playbook.id} className="cursor-pointer hover:shadow-md transition-all duration-300 hover-scale">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-lg">{playbook.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(playbook);
                      }}
                      className="h-8 w-8 p-0 hover-scale"
                      title="View strategy details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(playbook);
                      }}
                      className="h-8 w-8 p-0 hover-scale"
                      title="Edit strategy"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(playbook);
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover-scale"
                      title="Delete strategy"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {playbook.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {playbook.tags?.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="text-muted-foreground">No strategies yet.</div>
          )}
        </div>
      )}

      <FloatingActionButton
        onClick={() => setShowAddPlaybook(true)}
        icon={Plus}
        label="New Strategy"
      />

      <AddPlaybookDialog 
        open={showAddPlaybook} 
        onOpenChange={(o) => {
          setShowAddPlaybook(o);
          if (!o) setTimeout(loadPlaybooks, 300);
        }} 
      />

      <EditPlaybookDialog
        open={showEditPlaybook}
        onOpenChange={setShowEditPlaybook}
        playbook={editingPlaybook}
        onSuccess={loadPlaybooks}
      />

      <DeletePlaybookDialog
        open={showDeletePlaybook}
        onOpenChange={setShowDeletePlaybook}
        playbook={deletingPlaybook}
        onSuccess={loadPlaybooks}
      />

      <StrategyDetailsDialog
        open={showStrategyDetails}
        onOpenChange={setShowStrategyDetails}
        playbook={viewingPlaybook}
      />
    </div>
  );
}

