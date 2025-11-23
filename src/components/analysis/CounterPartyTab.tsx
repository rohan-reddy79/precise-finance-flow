import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { supabase } from "@/integrations/supabase/client";

interface CounterPartyTabProps {
  projectId: string;
}

interface CounterpartyData {
  name: string;
  amount: number;
  percentage: number;
  txnCount: number;
}

const CounterPartyTab = ({ projectId }: CounterPartyTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [creditCounterparties, setCreditCounterparties] = useState<CounterpartyData[]>([]);
  const [debitCounterparties, setDebitCounterparties] = useState<CounterpartyData[]>([]);

  useEffect(() => {
    loadCounterparties();
  }, [projectId]);

  async function loadCounterparties() {
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

      // Aggregate by merchant/description
      const creditMap = new Map<string, { amount: number; count: number }>();
      const debitMap = new Map<string, { amount: number; count: number }>();

      let totalCredits = 0;
      let totalDebits = 0;

      transactions.forEach(txn => {
        const key = txn.merchant || txn.description.substring(0, 40);
        const amount = Number(txn.amount);

        if (txn.is_debit) {
          totalDebits += amount;
          const existing = debitMap.get(key) || { amount: 0, count: 0 };
          debitMap.set(key, { amount: existing.amount + amount, count: existing.count + 1 });
        } else {
          totalCredits += amount;
          const existing = creditMap.get(key) || { amount: 0, count: 0 };
          creditMap.set(key, { amount: existing.amount + amount, count: existing.count + 1 });
        }
      });

      // Convert to arrays and compute percentages
      const creditList = Array.from(creditMap.entries())
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          percentage: totalCredits > 0 ? (data.amount / totalCredits) * 100 : 0,
          txnCount: data.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      const debitList = Array.from(debitMap.entries())
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          percentage: totalDebits > 0 ? (data.amount / totalDebits) * 100 : 0,
          txnCount: data.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      setCreditCounterparties(creditList);
      setDebitCounterparties(debitList);
    } catch (error) {
      console.error("Error loading counterparties:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading counterparty data...</div>
      </div>
    );
  }

  if (creditCounterparties.length === 0 && debitCounterparties.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No counterparty data available.</div>
      </div>
    );
  }

  const filteredCredit = creditCounterparties.filter(cp =>
    cp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDebit = debitCounterparties.filter(cp =>
    cp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold">CounterParty Analysis</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search counterparty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Credit Transactions (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Counterparty</th>
                    <th className="text-right p-2">Amount ({currencySymbol})</th>
                    <th className="text-right p-2">Amount %</th>
                    <th className="text-right p-2">Txns Count</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCredit.map((cp, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{cp.name}</td>
                      <td className="text-right p-2">{cp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="text-right p-2">{cp.percentage.toFixed(1)}%</td>
                      <td className="text-right p-2">{cp.txnCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debit Transactions (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Counterparty</th>
                    <th className="text-right p-2">Amount ({currencySymbol})</th>
                    <th className="text-right p-2">Amount %</th>
                    <th className="text-right p-2">Txns Count</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDebit.map((cp, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{cp.name}</td>
                      <td className="text-right p-2">{cp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="text-right p-2">{cp.percentage.toFixed(1)}%</td>
                      <td className="text-right p-2">{cp.txnCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CounterPartyTab;
