import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { supabase } from "@/integrations/supabase/client";

interface CategoriesTabProps {
  projectId: string;
}

interface CategoryData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

const CategoriesTab = ({ projectId }: CategoriesTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [loading, setLoading] = useState(true);
  const [expenseCategories, setExpenseCategories] = useState<CategoryData[]>([]);
  const [inflowCategories, setInflowCategories] = useState<CategoryData[]>([]);

  useEffect(() => {
    loadCategories();
  }, [projectId]);

  async function loadCategories() {
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

      // Aggregate expenses (debits)
      const expenseMap = new Map<string, { amount: number; count: number }>();
      const inflowMap = new Map<string, { amount: number; count: number }>();

      let totalExpenses = 0;
      let totalInflows = 0;

      transactions.forEach(txn => {
        const category = txn.category || "Miscellaneous";
        const amount = Number(txn.amount);

        if (txn.is_debit) {
          totalExpenses += amount;
          const existing = expenseMap.get(category) || { amount: 0, count: 0 };
          expenseMap.set(category, { amount: existing.amount + amount, count: existing.count + 1 });
        } else {
          totalInflows += amount;
          const existing = inflowMap.get(category) || { amount: 0, count: 0 };
          inflowMap.set(category, { amount: existing.amount + amount, count: existing.count + 1 });
        }
      });

      const expenseList = Array.from(expenseMap.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
          percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      const inflowList = Array.from(inflowMap.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
          percentage: totalInflows > 0 ? (data.amount / totalInflows) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      setExpenseCategories(expenseList);
      setInflowCategories(inflowList);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading category data...</div>
      </div>
    );
  }

  if (expenseCategories.length === 0 && inflowCategories.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No transaction categories available.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Transaction Categories</h2>

      <Tabs defaultValue="expenses">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Operating Expenses</TabsTrigger>
          <TabsTrigger value="inflows">Inflow Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Operating Expenses Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Category</th>
                      <th className="text-right p-2">Amount ({currencySymbol})</th>
                      <th className="text-right p-2">Transactions</th>
                      <th className="text-right p-2">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseCategories.map((cat, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <Badge variant="outline">{cat.category}</Badge>
                        </td>
                        <td className="text-right p-2 font-medium">
                          {cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right p-2">{cat.count}</td>
                        <td className="text-right p-2">{cat.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inflows">
          <Card>
            <CardHeader>
              <CardTitle>Inflow Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Category</th>
                      <th className="text-right p-2">Amount ({currencySymbol})</th>
                      <th className="text-right p-2">Transactions</th>
                      <th className="text-right p-2">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inflowCategories.map((cat, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <Badge variant="outline">{cat.category}</Badge>
                        </td>
                        <td className="text-right p-2 font-medium">
                          {cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right p-2">{cat.count}</td>
                        <td className="text-right p-2">{cat.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CategoriesTab;
