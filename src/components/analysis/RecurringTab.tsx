import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface RecurringTabProps {
  projectId: string;
}

interface RecurringTransaction {
  description: string;
  merchant: string | null;
  amount: number;
  occurrences: number;
  dates: string[];
  avgInterval: number;
  isDebit: boolean;
}

const RecurringTab = ({ projectId }: RecurringTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [loading, setLoading] = useState(true);
  const [recurringCredits, setRecurringCredits] = useState<RecurringTransaction[]>([]);
  const [recurringDebits, setRecurringDebits] = useState<RecurringTransaction[]>([]);

  useEffect(() => {
    loadRecurringTransactions();
  }, [projectId]);

  const loadRecurringTransactions = async () => {
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
        .order("transaction_date", { ascending: true });

      if (!transactions) {
        setLoading(false);
        return;
      }

      // Group similar transactions
      const groupedTransactions = new Map<string, RecurringTransaction>();

      transactions.forEach((txn) => {
        const amount = parseFloat(txn.amount.toString());
        const normalizedDesc = txn.description.toLowerCase().replace(/\d+/g, "").trim();
        const key = `${normalizedDesc}-${Math.round(amount)}-${txn.is_debit}`;

        if (groupedTransactions.has(key)) {
          const existing = groupedTransactions.get(key)!;
          existing.occurrences++;
          existing.dates.push(txn.transaction_date);
        } else {
          groupedTransactions.set(key, {
            description: txn.description,
            merchant: txn.merchant,
            amount,
            occurrences: 1,
            dates: [txn.transaction_date],
            avgInterval: 0,
            isDebit: txn.is_debit || false,
          });
        }
      });

      // Calculate average intervals and filter recurring (3+ occurrences)
      const recurring: RecurringTransaction[] = [];
      groupedTransactions.forEach((txn) => {
        if (txn.occurrences >= 3) {
          const sortedDates = txn.dates.sort();
          const intervals: number[] = [];
          for (let i = 1; i < sortedDates.length; i++) {
            const diff = Math.abs(
              new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()
            );
            intervals.push(Math.round(diff / (1000 * 60 * 60 * 24)));
          }
          txn.avgInterval = intervals.length > 0
            ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
            : 0;
          recurring.push(txn);
        }
      });

      // Separate credits and debits
      const credits = recurring.filter((t) => !t.isDebit).sort((a, b) => b.amount - a.amount);
      const debits = recurring.filter((t) => t.isDebit).sort((a, b) => b.amount - a.amount);

      setRecurringCredits(credits);
      setRecurringDebits(debits);
      setLoading(false);
    } catch (error) {
      console.error("Error loading recurring transactions:", error);
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
    {
      name: "Recurring Credits",
      count: recurringCredits.length,
      amount: recurringCredits.reduce((sum, t) => sum + t.amount * t.occurrences, 0),
    },
    {
      name: "Recurring Debits",
      count: recurringDebits.length,
      amount: recurringDebits.reduce((sum, t) => sum + t.amount * t.occurrences, 0),
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Recurring Payments Analysis</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Recurring Credits Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{recurringCredits.length}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Total: {currencySymbol}
              {recurringCredits
                .reduce((sum, t) => sum + t.amount * t.occurrences, 0)
                .toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Recurring Debits Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{recurringDebits.length}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Total: {currencySymbol}
              {recurringDebits
                .reduce((sum, t) => sum + t.amount * t.occurrences, 0)
                .toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recurring Transactions Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Count" />
              <Bar yAxisId="right" dataKey="amount" fill="#82ca9d" name="Total Amount" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recurring Credit Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recurringCredits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No recurring credits detected</p>
          ) : (
            <div className="space-y-3">
              {recurringCredits.map((txn, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{txn.description}</p>
                      {txn.merchant && (
                        <p className="text-sm text-muted-foreground">Merchant: {txn.merchant}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-green-600">
                        {currencySymbol}{txn.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {txn.occurrences} times
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Avg Interval: ~{txn.avgInterval} days</span>
                    <span>First: {new Date(txn.dates[0]).toLocaleDateString()}</span>
                    <span>Last: {new Date(txn.dates[txn.dates.length - 1]).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recurring Debit Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recurringDebits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No recurring debits detected</p>
          ) : (
            <div className="space-y-3">
              {recurringDebits.map((txn, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{txn.description}</p>
                      {txn.merchant && (
                        <p className="text-sm text-muted-foreground">Merchant: {txn.merchant}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-red-600">
                        {currencySymbol}{txn.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {txn.occurrences} times
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Avg Interval: ~{txn.avgInterval} days</span>
                    <span>First: {new Date(txn.dates[0]).toLocaleDateString()}</span>
                    <span>Last: {new Date(txn.dates[txn.dates.length - 1]).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecurringTab;
