import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { supabase } from "@/integrations/supabase/client";

interface ChequeReturnTabProps {
  projectId: string;
}

interface ChequeReturn {
  date: string;
  amount: number;
  party: string;
  reason: string;
}

const ChequeReturnTab = ({ projectId }: ChequeReturnTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [loading, setLoading] = useState(true);
  const [chequeReturns, setChequeReturns] = useState<ChequeReturn[]>([]);
  const [summary, setSummary] = useState({
    totalReturned: 0,
    totalAmount: 0,
    avgAmount: 0,
  });

  useEffect(() => {
    loadChequeReturns();
  }, [projectId]);

  async function loadChequeReturns() {
    try {
      setLoading(true);
      const { data: statements } = await supabase
        .from("bank_statements")
        .select("id")
        .eq("project_id", projectId);

      if (!statements || statements.length === 0) {
        setLoading(false);
        return;
      }

      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .in("statement_id", statements.map(s => s.id));

      if (!transactions || transactions.length === 0) {
        setLoading(false);
        return;
      }

      // Detect cheque returns by description keywords
      const chequeKeywords = ["cheque return", "chq rtn", "cheque dishonoured", "cheque bounced", "chq bounce", "cheque dishonored"];
      
      const returns = transactions
        .filter(txn => 
          chequeKeywords.some(kw => txn.description.toLowerCase().includes(kw))
        )
        .map(txn => ({
          date: txn.transaction_date,
          amount: Number(txn.amount),
          party: txn.merchant || txn.description.substring(0, 40),
          reason: txn.description.toLowerCase().includes("insufficient") ? "Insufficient Funds" : "Other",
        }));

      setChequeReturns(returns);

      if (returns.length > 0) {
        const totalAmount = returns.reduce((sum, r) => sum + r.amount, 0);
        setSummary({
          totalReturned: returns.length,
          totalAmount,
          avgAmount: totalAmount / returns.length,
        });
      }
    } catch (error) {
      console.error("Error loading cheque returns:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading cheque return data...</div>
      </div>
    );
  }

  if (chequeReturns.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Badge variant="secondary" className="text-lg">No Cheque Returns Detected</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                No transactions matching cheque return patterns were found in your statements.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Cheque Return Analysis</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Returned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalReturned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{summary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{summary.avgAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cheque Returns Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Amount ({currencySymbol})</th>
                  <th className="text-left p-2">Party</th>
                  <th className="text-left p-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {chequeReturns.map((ret, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2">{new Date(ret.date).toLocaleDateString()}</td>
                    <td className="text-right p-2 font-medium">{ret.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-2">{ret.party}</td>
                    <td className="p-2">
                      <Badge variant="destructive">{ret.reason}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChequeReturnTab;
