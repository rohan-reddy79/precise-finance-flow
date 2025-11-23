import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { supabase } from "@/integrations/supabase/client";

interface AMLAnalysisTabProps {
  projectId: string;
}

const AMLAnalysisTab = ({ projectId }: AMLAnalysisTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({});
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<any[]>([]);
  const [riskScore, setRiskScore] = useState(0);

  useEffect(() => {
    loadAMLData();
  }, [projectId]);

  async function loadAMLData() {
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

      // Filter to July 2024 - June 2025
      const filtered = transactions.filter(t => {
        const d = new Date(t.transaction_date);
        return d >= new Date(2024, 6, 1) && d <= new Date(2025, 5, 30);
      });

      // Compute metrics
      const totalCredits = filtered.filter(t => !t.is_debit).reduce((sum, t) => sum + Number(t.amount), 0);
      const totalDebits = filtered.filter(t => t.is_debit).reduce((sum, t) => sum + Number(t.amount), 0);
      const transactionCount = filtered.length;
      const largestCredit = Math.max(...filtered.filter(t => !t.is_debit).map(t => Number(t.amount)), 0);
      const largestDebit = Math.max(...filtered.filter(t => t.is_debit).map(t => Number(t.amount)), 0);
      const uniqueDates = new Set(filtered.map(t => t.transaction_date)).size;

      // Simple risk detection
      const suspiciousKeywords = ["cash", "atm", "withdrawal", "wire", "international"];
      const suspiciousTxns = filtered.filter(t => 
        suspiciousKeywords.some(kw => t.description.toLowerCase().includes(kw)) || Number(t.amount) > 10000
      );
      const riskPct = transactionCount > 0 ? (suspiciousTxns.length / transactionCount) * 100 : 0;

      setMetrics({
        totalCredits,
        totalDebits,
        transactionCount,
        largestCredit,
        largestDebit,
        daysActive: uniqueDates,
        suspiciousCount: suspiciousTxns.length,
      });

      setRiskScore(Math.min(Math.round(riskPct), 100));

      // Monthly deposits vs withdrawals
      const monthlyMap = new Map<string, any>();
      const startDate = new Date(2024, 6, 1);
      for (let i = 0; i < 12; i++) {
        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);
        const monthKey = date.toLocaleDateString("en-US", { month: "short" });
        monthlyMap.set(monthKey, { month: monthKey, deposits: 0, withdrawals: 0 });
      }

      filtered.forEach(txn => {
        const txnDate = new Date(txn.transaction_date);
        const monthKey = txnDate.toLocaleDateString("en-US", { month: "short" });
        const monthData = monthlyMap.get(monthKey);
        if (monthData) {
          if (txn.is_debit) {
            monthData.withdrawals += Number(txn.amount);
          } else {
            monthData.deposits += Number(txn.amount);
          }
        }
      });

      setMonthlyData(Array.from(monthlyMap.values()));

      // Suspicious activities
      const activities = [
        { name: "High-value transactions (>$10K)", count: filtered.filter(t => Number(t.amount) > 10000).length },
        { name: "Cash transactions", count: filtered.filter(t => t.description.toLowerCase().includes("cash")).length },
        { name: "International transfers", count: filtered.filter(t => t.description.toLowerCase().includes("international") || t.description.toLowerCase().includes("wire")).length },
        { name: "Rapid transactions", count: 0 }, // Placeholder for now
      ];

      setSuspiciousActivities(activities);
    } catch (error) {
      console.error("Error loading AML data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading AML analysis...</div>
      </div>
    );
  }

  if (!metrics.transactionCount) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No transactions found for July 2024 – June 2025.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AML Risk Analysis</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {riskScore}
              <Badge className="ml-2" variant={riskScore > 50 ? "destructive" : riskScore > 25 ? "default" : "secondary"}>
                {riskScore > 50 ? "High" : riskScore > 25 ? "Medium" : "Low"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{metrics.totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{metrics.totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transaction Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.transactionCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Largest Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{currencySymbol}{metrics.largestCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Largest Debit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{currencySymbol}{metrics.largestDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Days Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{metrics.daysActive}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Deposits vs Withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="deposits" stroke="#10b981" name="Deposits" />
              <Line type="monotone" dataKey="withdrawals" stroke="#ef4444" name="Withdrawals" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suspicious Activities Detected</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {suspiciousActivities.map((activity, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 border-b">
                <span>{activity.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={activity.count > 0 ? "destructive" : "secondary"}>{activity.count}</Badge>
                  {activity.count > 0 && <Button variant="outline" size="sm">View</Button>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AMLAnalysisTab;
