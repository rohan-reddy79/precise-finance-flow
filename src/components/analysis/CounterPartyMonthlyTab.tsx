import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { supabase } from "@/integrations/supabase/client";

interface CounterPartyMonthlyTabProps {
  projectId: string;
}

const CounterPartyMonthlyTab = ({ projectId }: CounterPartyMonthlyTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [counterpartyData, setCounterpartyData] = useState<any[]>([]);
  const [months, setMonths] = useState<string[]>([]);

  useEffect(() => {
    loadMonthlyData();
  }, [projectId]);

  async function loadMonthlyData() {
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

      // Build month list (July 2024 to June 2025)
      const monthList: string[] = [];
      const startDate = new Date(2024, 6, 1);
      for (let i = 0; i < 12; i++) {
        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);
        monthList.push(date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }));
      }
      setMonths(monthList);

      // Aggregate by merchant and month
      const merchantMonthMap = new Map<string, any>();

      transactions.forEach(txn => {
        const txnDate = new Date(txn.transaction_date);
        if (txnDate >= new Date(2024, 6, 1) && txnDate <= new Date(2025, 5, 30)) {
          const merchantKey = txn.merchant || txn.description.substring(0, 40);
          const monthKey = txnDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

          if (!merchantMonthMap.has(merchantKey)) {
            merchantMonthMap.set(merchantKey, {
              counterparty: merchantKey,
              totalCredit: 0,
              totalDebit: 0,
              creditCount: 0,
              debitCount: 0,
              months: new Map<string, any>(),
            });
          }

          const merchantData = merchantMonthMap.get(merchantKey)!;
          if (!merchantData.months.has(monthKey)) {
            merchantData.months.set(monthKey, { creditTotal: 0, creditCount: 0, debitTotal: 0, debitCount: 0 });
          }

          const monthData = merchantData.months.get(monthKey);
          const amount = Number(txn.amount);

          if (txn.is_debit) {
            merchantData.totalDebit += amount;
            merchantData.debitCount += 1;
            monthData.debitTotal += amount;
            monthData.debitCount += 1;
          } else {
            merchantData.totalCredit += amount;
            merchantData.creditCount += 1;
            monthData.creditTotal += amount;
            monthData.creditCount += 1;
          }
        }
      });

      const dataArray = Array.from(merchantMonthMap.values())
        .sort((a, b) => (b.totalCredit + b.totalDebit) - (a.totalCredit + a.totalDebit))
        .slice(0, 20);

      setCounterpartyData(dataArray);
    } catch (error) {
      console.error("Error loading monthly counterparty data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading monthly counterparty data...</div>
      </div>
    );
  }

  if (counterpartyData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No counterparty data available.</div>
      </div>
    );
  }

  const filteredData = counterpartyData.filter(cp =>
    cp.counterparty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold">CounterParty Monthly Breakdown</h2>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
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

      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown (Top 20 Counterparties)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 sticky left-0 bg-background">Counterparty</th>
                  <th className="text-right p-2">Total Credit</th>
                  <th className="text-right p-2">Total Debit</th>
                  {months.map(month => (
                    <th key={month} className="text-center p-2">
                      {month}
                      <div className="text-[10px] text-muted-foreground">Cr / Db</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((cp, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium sticky left-0 bg-background">{cp.counterparty}</td>
                    <td className="text-right p-2 text-green-600">
                      {currencySymbol}{cp.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </td>
                    <td className="text-right p-2 text-red-600">
                      {currencySymbol}{cp.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </td>
                    {months.map(month => {
                      const monthData = cp.months.get(month) || { creditTotal: 0, debitTotal: 0 };
                      return (
                        <td key={month} className="text-center p-2 text-[10px]">
                          {monthData.creditTotal > 0 || monthData.debitTotal > 0 ? (
                            <>
                              <div className="text-green-600">{monthData.creditTotal > 0 ? monthData.creditTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—"}</div>
                              <div className="text-red-600">{monthData.debitTotal > 0 ? monthData.debitTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—"}</div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
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

export default CounterPartyMonthlyTab;
