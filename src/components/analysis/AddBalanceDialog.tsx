import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddBalanceDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Statement {
  id: string;
  file_name: string;
  statement_period_start: string | null;
  statement_period_end: string | null;
}

export const AddBalanceDialog = ({ projectId, open, onOpenChange, onSuccess }: AddBalanceDialogProps) => {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState<string>("");
  const [openingBalance, setOpeningBalance] = useState<string>("");
  const [closingBalance, setClosingBalance] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadStatements();
    }
  }, [open, projectId]);

  const loadStatements = async () => {
    const { data, error } = await supabase
      .from("bank_statements")
      .select("id, file_name, statement_period_start, statement_period_end")
      .eq("project_id", projectId)
      .order("statement_period_start", { ascending: false });

    if (!error && data) {
      setStatements(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStatementId || !openingBalance || !closingBalance) {
      toast.error("Please fill in all fields");
      return;
    }

    const opening = parseFloat(openingBalance);
    const closing = parseFloat(closingBalance);

    if (isNaN(opening) || isNaN(closing)) {
      toast.error("Please enter valid numbers");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("bank_statements")
      .update({
        opening_balance: opening,
        closing_balance: closing,
      })
      .eq("id", selectedStatementId);

    setLoading(false);

    if (error) {
      toast.error("Failed to update balance");
      console.error(error);
      return;
    }

    toast.success("Balance data added successfully");
    setSelectedStatementId("");
    setOpeningBalance("");
    setClosingBalance("");
    onSuccess();
    onOpenChange(false);
  };

  const selectedStatement = statements.find(s => s.id === selectedStatementId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Balance Data Manually</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="statement">Select Statement</Label>
            <Select value={selectedStatementId} onValueChange={setSelectedStatementId}>
              <SelectTrigger id="statement">
                <SelectValue placeholder="Choose a statement" />
              </SelectTrigger>
              <SelectContent>
                {statements.map((stmt) => (
                  <SelectItem key={stmt.id} value={stmt.id}>
                    {stmt.file_name}
                    {stmt.statement_period_start && stmt.statement_period_end && 
                      ` (${new Date(stmt.statement_period_start).toLocaleDateString()} - ${new Date(stmt.statement_period_end).toLocaleDateString()})`
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStatement && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Statement Period:</p>
              <p className="text-muted-foreground">
                {selectedStatement.statement_period_start && selectedStatement.statement_period_end
                  ? `${new Date(selectedStatement.statement_period_start).toLocaleDateString()} - ${new Date(selectedStatement.statement_period_end).toLocaleDateString()}`
                  : "Period not available"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="opening">Opening Balance</Label>
            <Input
              id="opening"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="closing">Closing Balance</Label>
            <Input
              id="closing"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Balance Data
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
