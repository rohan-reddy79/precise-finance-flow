import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";

interface TransactionsTabProps {
  projectId: string;
}

const TransactionsTab = ({ projectId }: TransactionsTabProps) => {
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currencySymbol } = useProjectCurrency(projectId);

  useEffect(() => {
    loadTransactions();
  }, [projectId]);

  const loadTransactions = async () => {
    try {
      // Get statement IDs for this project
      const { data: statements } = await supabase
        .from('bank_statements')
        .select('id')
        .eq('project_id', projectId);

      if (!statements || statements.length === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const statementIds = statements.map(s => s.id);

      // Fetch transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .in('statement_id', statementIds)
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = filter === "" || 
      txn.description.toLowerCase().includes(filter.toLowerCase()) ||
      (txn.merchant && txn.merchant.toLowerCase().includes(filter.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || txn.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const preDefinedFilters = ["Cash transactions", "Cheque", "High value debit txns", "High value credit txns"];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold">All Transactions</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Input 
                placeholder="Search transactions..." 
                className="max-w-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Shopping">Shopping</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No transactions found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Merchant</th>
                      <th className="text-right p-2">Credit</th>
                      <th className="text-right p-2">Debit</th>
                      <th className="text-left p-2">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((txn, idx) => (
                      <tr key={txn.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{new Date(txn.transaction_date).toLocaleDateString()}</td>
                        <td className="p-2">{txn.description}</td>
                        <td className="p-2 text-muted-foreground">{txn.merchant || '-'}</td>
                        <td className="text-right p-2 text-green-600">
                          {!txn.is_debit ? `${currencySymbol}${parseFloat(txn.amount).toLocaleString()}` : "-"}
                        </td>
                        <td className="text-right p-2 text-red-600">
                          {txn.is_debit ? `${currencySymbol}${parseFloat(txn.amount).toLocaleString()}` : "-"}
                        </td>
                        <td className="p-2">
                          <Badge variant="outline">{txn.category || 'Uncategorized'}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pre-Defined Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {preDefinedFilters.map((filter, idx) => (
                <Button key={idx} variant="outline" size="sm" className="w-full justify-start">
                  {filter}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>Amount (Debit/Credit)</div>
              <div>Balance</div>
              <div>Category</div>
              <div>Cheque/Ref nbr</div>
              <div>Counterparty</div>
              <div>Txn date</div>
              <div>Txn mode</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TransactionsTab;
