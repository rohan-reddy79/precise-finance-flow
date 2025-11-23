import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { supabase } from "@/integrations/supabase/client";

interface BizCashFlowTabProps {
  projectId: string;
}

const BizCashFlowTab = ({ projectId }: BizCashFlowTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [quarterlyData, setQuarterlyData] = useState<any[]>([]);

  useEffect(() => {
    loadCashFlowData();
  }, [projectId]);

  async function loadCashFlowData() {
    try {
      setLoading(true);
      const { data: statements } = await supabase
        .from("bank_statements")
        .select("id")
        .eq("project_id", projectId);

      if (!statements || statements.length === 0) {
        setMonthlyData([]);
        setQuarterlyData([]);
        setLoading(false);
        return;
      }

      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .in("statement_id", statements.map(s => s.id));

      if (!transactions) {
        setMonthlyData([]);
        setQuarterlyData([]);
        setLoading(false);
        return;
      }

      // Build monthly map for July 2024 to June 2025
      const monthlyMap = new Map<string, any>();
      const startDate = new Date(2024, 6, 1);
      for (let i = 0; i < 12; i++) {
        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);
        const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const sortKey = date.getFullYear() * 12 + date.getMonth();
        
        monthlyMap.set(monthKey, {
          month: monthKey,
          sortKey,
          totalInflow: 0,
          totalOutflow: 0,
          netBizCashFlow: 0,
          bizInflowTxns: 0,
          bizOutflowTxns: 0,
        });
      }

      // Aggregate transactions
      transactions.forEach(txn => {
        const txnDate = new Date(txn.transaction_date);
        if (txnDate >= new Date(2024, 6, 1) && txnDate <= new Date(2025, 5, 30)) {
          const monthKey = txnDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          const monthData = monthlyMap.get(monthKey);
          if (monthData) {
            if (txn.is_debit) {
              monthData.totalOutflow += Number(txn.amount);
              monthData.bizOutflowTxns += 1;
            } else {
              monthData.totalInflow += Number(txn.amount);
              monthData.bizInflowTxns += 1;
            }
            monthData.netBizCashFlow = monthData.totalInflow - monthData.totalOutflow;
          }
        }
      });

      const sorted = Array.from(monthlyMap.values()).sort((a, b) => a.sortKey - b.sortKey);
      setMonthlyData(sorted);

      // Build quarterly summary
      const quarters = [
        { period: "Q1 (Jul-Sep 24)", months: sorted.slice(0, 3) },
        { period: "Q2 (Oct-Dec 24)", months: sorted.slice(3, 6) },
        { period: "Q3 (Jan-Mar 25)", months: sorted.slice(6, 9) },
        { period: "Q4 (Apr-Jun 25)", months: sorted.slice(9, 12) },
      ];

      const quarterlySummary = quarters.map(q => {
        const avgInflow = q.months.reduce((sum, m) => sum + m.totalInflow, 0) / 3;
        const avgOutflow = q.months.reduce((sum, m) => sum + m.totalOutflow, 0) / 3;
        const netCashFlow = q.months.reduce((sum, m) => sum + m.netBizCashFlow, 0);
        return {
          period: q.period,
          avgInflow,
          avgOutflow,
          netCashFlow,
        };
      });

      setQuarterlyData(quarterlySummary);
    } catch (error) {
      console.error("Error loading cash flow data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading cash flow data...</div>
      </div>
    );
  }

  if (monthlyData.length === 0 || monthlyData.every(m => m.totalInflow === 0 && m.totalOutflow === 0)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No transactions found for July 2024 – June 2025.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Business Cash Flow Analysis</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Monthly Business Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Month</th>
                  <th className="text-right p-2">Total Inflow ({currencySymbol})</th>
                  <th className="text-right p-2">Biz Inflow ({currencySymbol})</th>
                  <th className="text-right p-2">% Biz Inflow</th>
                  <th className="text-right p-2">Biz Inflow Txns</th>
                  <th className="text-right p-2">Total Outflow ({currencySymbol})</th>
                  <th className="text-right p-2">Biz Outflow ({currencySymbol})</th>
                  <th className="text-right p-2">% Biz Outflow</th>
                  <th className="text-right p-2">Biz Outflow Txns</th>
                  <th className="text-right p-2">Net Biz Cash Flow ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{row.month}</td>
                    <td className="text-right p-2">{currencySymbol}{row.totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="text-right p-2">{currencySymbol}{row.totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="text-right p-2">100%</td>
                    <td className="text-right p-2">{row.bizInflowTxns}</td>
                    <td className="text-right p-2">{currencySymbol}{row.totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="text-right p-2">{currencySymbol}{row.totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="text-right p-2">100%</td>
                    <td className="text-right p-2">{row.bizOutflowTxns}</td>
                    <td className="text-right p-2 font-semibold">{currencySymbol}{row.netBizCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cumulative Quarterly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Period</th>
                  <th className="text-right p-2">Avg Inflow ({currencySymbol})</th>
                  <th className="text-right p-2">Avg Outflow ({currencySymbol})</th>
                  <th className="text-right p-2">Net Cash Flow ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {quarterlyData.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{row.period}</td>
                    <td className="text-right p-2">{currencySymbol}{row.avgInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="text-right p-2">{currencySymbol}{row.avgOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="text-right p-2 font-semibold">{currencySymbol}{row.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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

export default BizCashFlowTab;
