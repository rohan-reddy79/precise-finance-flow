import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

import { useProjectCurrency } from "@/hooks/useProjectCurrency";

interface SummaryTabProps {
  projectId: string;
}

const SummaryTab = ({ projectId }: SummaryTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalCredit: 0,
    totalDebit: 0,
    netFlow: 0,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadSummary();
  }, [projectId]);

  const loadSummary = async () => {
    try {
      // Get statements for this project
      const { data: statements } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('project_id', projectId);

      if (!statements || statements.length === 0) {
        setLoading(false);
        return;
      }

      const statementIds = statements.map(s => s.id);

      // Fetch all transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .in('statement_id', statementIds);

      if (!transactions || transactions.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate totals
      const totalCredit = transactions
        .filter(t => !t.is_debit)
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      const totalDebit = transactions
        .filter(t => t.is_debit)
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      const dates = transactions.map(t => new Date(t.transaction_date)).sort((a, b) => a.getTime() - b.getTime());

      setSummary({
        totalTransactions: transactions.length,
        totalCredit,
        totalDebit,
        netFlow: totalCredit - totalDebit,
        startDate: dates[0]?.toLocaleDateString() || '',
        endDate: dates[dates.length - 1]?.toLocaleDateString() || '',
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading summary:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Financial Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.totalTransactions.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {currencySymbol}{summary.totalCredit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {currencySymbol}{summary.totalDebit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currencySymbol}{summary.netFlow.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Period Start</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{summary.startDate || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Period End</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{summary.endDate || 'N/A'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SummaryTab;
