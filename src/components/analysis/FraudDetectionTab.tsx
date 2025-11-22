import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface FraudDetectionTabProps {
  projectId: string;
}

interface FraudAlert {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchant: string | null;
  riskLevel: "high" | "medium" | "low";
  reasons: string[];
}

const COLORS = ["#ef4444", "#f59e0b", "#10b981"];

const FraudDetectionTab = ({ projectId }: FraudDetectionTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [loading, setLoading] = useState(true);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [summary, setSummary] = useState({ high: 0, medium: 0, low: 0 });

  useEffect(() => {
    loadFraudDetection();
  }, [projectId]);

  const loadFraudDetection = async () => {
    try {
      const { data: statements } = await supabase
        .from("bank_statements")
        .select("id")
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
        .order("transaction_date", { ascending: false });

      if (!transactions) {
        setLoading(false);
        return;
      }

      // Fraud detection logic
      const alerts: FraudAlert[] = [];
      const amounts = transactions.map((t) => parseFloat(t.amount.toString()));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) / amounts.length
      );

      // Group by date for frequency analysis
      const dailyTransactions = new Map<string, number>();
      transactions.forEach((t) => {
        const date = t.transaction_date;
        dailyTransactions.set(date, (dailyTransactions.get(date) || 0) + 1);
      });

      // Analyze each transaction
      transactions.forEach((txn) => {
        const reasons: string[] = [];
        let riskLevel: "high" | "medium" | "low" = "low";
        const amount = parseFloat(txn.amount.toString());

        // Rule 1: Unusually large amount (> 3 standard deviations)
        if (amount > avgAmount + 3 * stdDev) {
          reasons.push("Unusually large transaction amount");
          riskLevel = "high";
        }

        // Rule 2: Round number transactions (potential fraud indicator)
        if (amount >= 1000 && amount % 1000 === 0) {
          reasons.push("Exact round number transaction");
          if (riskLevel === "low") riskLevel = "medium";
        }

        // Rule 3: Multiple transactions on same day
        const dailyCount = dailyTransactions.get(txn.transaction_date) || 0;
        if (dailyCount > 10) {
          reasons.push(`High transaction frequency (${dailyCount} transactions on same day)`);
          if (riskLevel === "low") riskLevel = "medium";
        }

        // Rule 4: Suspicious keywords
        const suspiciousKeywords = ["ATM", "CASH WITHDRAWAL", "FOREIGN", "CRYPTO", "GAMBLING"];
        const desc = txn.description.toUpperCase();
        suspiciousKeywords.forEach((keyword) => {
          if (desc.includes(keyword) && amount > 5000) {
            reasons.push(`Large ${keyword.toLowerCase()} transaction`);
            if (riskLevel === "low") riskLevel = "medium";
          }
        });

        // Rule 5: Weekend large transactions
        const txnDate = new Date(txn.transaction_date);
        const dayOfWeek = txnDate.getDay();
        if ((dayOfWeek === 0 || dayOfWeek === 6) && amount > avgAmount * 2) {
          reasons.push("Large transaction on weekend");
          if (riskLevel === "low") riskLevel = "medium";
        }

        // Only add if we found suspicious indicators
        if (reasons.length > 0) {
          alerts.push({
            id: txn.id,
            date: txn.transaction_date,
            amount,
            description: txn.description,
            merchant: txn.merchant,
            riskLevel,
            reasons,
          });
        }
      });

      // Sort by risk level and date
      alerts.sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2 };
        if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setFraudAlerts(alerts);
      setSummary({
        high: alerts.filter((a) => a.riskLevel === "high").length,
        medium: alerts.filter((a) => a.riskLevel === "medium").length,
        low: alerts.filter((a) => a.riskLevel === "low").length,
      });
      setLoading(false);
    } catch (error) {
      console.error("Error loading fraud detection:", error);
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

  const chartData = [
    { name: "High Risk", value: summary.high, color: "#ef4444" },
    { name: "Medium Risk", value: summary.medium, color: "#f59e0b" },
    { name: "Low Risk", value: summary.low, color: "#10b981" },
  ];

  const monthlyRisk = fraudAlerts.reduce((acc, alert) => {
    const month = new Date(alert.date).toLocaleDateString("en-US", { year: "numeric", month: "short" });
    if (!acc[month]) acc[month] = { month, high: 0, medium: 0, low: 0 };
    acc[month][alert.riskLevel]++;
    return acc;
  }, {} as Record<string, { month: string; high: number; medium: number; low: number }>);

  const monthlyData = Object.values(monthlyRisk).sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Fraud Detection Analysis</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">High Risk Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{summary.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Medium Risk Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{summary.medium}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Low Risk Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{summary.low}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Risk Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="high" stackId="a" fill="#ef4444" name="High Risk" />
                <Bar dataKey="medium" stackId="a" fill="#f59e0b" name="Medium Risk" />
                <Bar dataKey="low" stackId="a" fill="#10b981" name="Low Risk" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suspicious Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fraudAlerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No suspicious transactions detected</p>
            ) : (
              fraudAlerts.map((alert) => (
                <div key={alert.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-5 w-5 ${
                          alert.riskLevel === "high"
                            ? "text-red-600"
                            : alert.riskLevel === "medium"
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      />
                      <Badge
                        variant={
                          alert.riskLevel === "high"
                            ? "destructive"
                            : alert.riskLevel === "medium"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {alert.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {currencySymbol}
                        {alert.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(alert.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium mb-2">{alert.description}</p>
                  {alert.merchant && (
                    <p className="text-sm text-muted-foreground mb-2">Merchant: {alert.merchant}</p>
                  )}
                  <div className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Risk Indicators:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {alert.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FraudDetectionTab;
