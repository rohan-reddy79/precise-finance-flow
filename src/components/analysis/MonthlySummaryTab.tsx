import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

interface MonthlySummaryTabProps {
  projectId: string;
}

interface MonthlyData {
  month: string;
  sortKey: number;
  openingBalance: number | null;
  closingBalance: number | null;
  totalCredit: number;
  totalDebit: number;
  creditCount: number;
  debitCount: number;
  netFlow: number;
}

const MonthlySummaryTab = ({ projectId }: MonthlySummaryTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    loadMonthlyData();
  }, [projectId]);

  const loadMonthlyData = async () => {
    try {
      const { data: statements } = await supabase
        .from("bank_statements")
        .select("id, opening_balance, closing_balance, statement_period_start")
        .eq("project_id", projectId);

      if (!statements || statements.length === 0) {
        setLoading(false);
        return;
      }

      const statementIds = statements.map((s) => s.id);
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .in("statement_id", statementIds)
        .order("transaction_date", { ascending: true });

      if (!transactions) {
        setLoading(false);
        return;
      }

      // Group transactions by month (July 2024 - June 2025)
      const monthlyMap = new Map<string, MonthlyData>();
      
      // Initialize all months from July 2024 to June 2025
      const startDate = new Date(2024, 6, 1); // July 2024
      for (let i = 0; i < 12; i++) {
        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);
        const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const sortKey = date.getFullYear() * 12 + date.getMonth();
        
        monthlyMap.set(monthKey, {
          month: monthKey,
          sortKey,
          openingBalance: null,
          closingBalance: null,
          totalCredit: 0,
          totalDebit: 0,
          creditCount: 0,
          debitCount: 0,
          netFlow: 0,
        });
      }

      // Populate with transaction data
      transactions.forEach((txn) => {
        const date = new Date(txn.transaction_date);
        const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        
        if (monthlyMap.has(monthKey)) {
          const monthData = monthlyMap.get(monthKey)!;
          const amount = parseFloat(txn.amount.toString());

          if (txn.is_debit) {
            monthData.totalDebit += amount;
            monthData.debitCount++;
          } else {
            monthData.totalCredit += amount;
            monthData.creditCount++;
          }
          monthData.netFlow = monthData.totalCredit - monthData.totalDebit;
        }
      });

      // Add balance information from statements
      statements.forEach((stmt) => {
        if (stmt.statement_period_start) {
          const date = new Date(stmt.statement_period_start);
          const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          if (monthlyMap.has(monthKey)) {
            const monthData = monthlyMap.get(monthKey)!;
            if (stmt.opening_balance !== null) {
              monthData.openingBalance = parseFloat(stmt.opening_balance.toString());
            }
            if (stmt.closing_balance !== null) {
              monthData.closingBalance = parseFloat(stmt.closing_balance.toString());
            }
          }
        }
      });

      const sortedData = Array.from(monthlyMap.values()).sort((a, b) => a.sortKey - b.sortKey);

      setMonthlyData(sortedData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading monthly summary:", error);
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
      <h2 className="text-2xl font-bold">Monthly Summary (July 2024 - June 2025)</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Credit vs Debit</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalCredit" fill="#10b981" name="Credit" />
                <Bar dataKey="totalDebit" fill="#ef4444" name="Debit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="closingBalance" stroke="#3b82f6" name="Closing Balance" />
                <Line type="monotone" dataKey="netFlow" stroke="#8b5cf6" name="Net Flow" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Monthly Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Balance columns show "—" when your statements don't provide opening/closing balances.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Month</th>
                  <th className="text-right p-3 font-semibold">Opening Balance</th>
                  <th className="text-right p-3 font-semibold">Total Credit</th>
                  <th className="text-right p-3 font-semibold">Credit Count</th>
                  <th className="text-right p-3 font-semibold">Total Debit</th>
                  <th className="text-right p-3 font-semibold">Debit Count</th>
                  <th className="text-right p-3 font-semibold">Net Flow</th>
                  <th className="text-right p-3 font-semibold">Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((month, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{month.month}</td>
                    <td className="text-right p-3">
                      {month.openingBalance !== null 
                        ? `${currencySymbol}${month.openingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}` 
                        : "—"}
                    </td>
                    <td className="text-right p-3 text-green-600">
                      {currencySymbol}{month.totalCredit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right p-3">{month.creditCount}</td>
                    <td className="text-right p-3 text-red-600">
                      {currencySymbol}{month.totalDebit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right p-3">{month.debitCount}</td>
                    <td className={`text-right p-3 font-medium ${month.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {currencySymbol}{month.netFlow.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right p-3 font-medium">
                      {month.closingBalance !== null 
                        ? `${currencySymbol}${month.closingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}` 
                        : "—"}
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

export default MonthlySummaryTab;
