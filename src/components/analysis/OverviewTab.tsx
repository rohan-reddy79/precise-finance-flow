import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface OverviewTabProps {
  projectId: string;
}

const OverviewTab = ({ projectId }: OverviewTabProps) => {
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<any>({});
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [topCounterparties, setTopCounterparties] = useState<{ credit: any[], debit: any[] }>({ credit: [], debit: [] });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      // Load account info and analysis data
      const { data: statements } = await supabase
        .from("bank_statements")
        .select("*")
        .eq("project_id", projectId)
        .limit(1)
        .single();

      if (statements) {
        setAccountInfo({});
      }

      // Mock monthly data for charts
      setMonthlyData([
        { month: "Jan", netCashFlow: 15000, netBizFlow: 12000, avgBalance: 50000 },
        { month: "Feb", netCashFlow: 18000, netBizFlow: 15000, avgBalance: 55000 },
        { month: "Mar", netCashFlow: 16000, netBizFlow: 13000, avgBalance: 52000 },
        { month: "Apr", netCashFlow: 20000, netBizFlow: 17000, avgBalance: 60000 },
        { month: "May", netCashFlow: 19000, netBizFlow: 16000, avgBalance: 58000 },
        { month: "Jun", netCashFlow: 21000, netBizFlow: 18000, avgBalance: 62000 },
      ]);

      // Mock top counterparties
      setTopCounterparties({
        credit: [
          { name: "ABC Corp", amount: 50000, percentage: 25, txnCount: 12, txnPercentage: 20 },
          { name: "XYZ Ltd", amount: 40000, percentage: 20, txnCount: 10, txnPercentage: 16 },
          { name: "Client A", amount: 30000, percentage: 15, txnCount: 8, txnPercentage: 13 },
        ],
        debit: [
          { name: "Vendor 1", amount: 35000, percentage: 30, txnCount: 15, txnPercentage: 25 },
          { name: "Supplier B", amount: 25000, percentage: 21, txnCount: 10, txnPercentage: 16 },
          { name: "Rent", amount: 20000, percentage: 17, txnCount: 6, txnPercentage: 10 },
        ],
      });

      setLoading(false);
    } catch (error) {
      console.error("Error loading overview data:", error);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Bank Account Number</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{accountInfo.accountNumber || "****1234"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Bank Name</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{accountInfo.bankName || "N/A"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Account Holder</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{accountInfo.accountHolder || "N/A"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Account Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{accountInfo.accountType || "Savings"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="netCashFlow" stroke="hsl(var(--primary))" strokeWidth={2} name="Net Cash Flow" />
                <Line type="monotone" dataKey="netBizFlow" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Net Business Flow" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Average Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                <Bar dataKey="avgBalance" fill="hsl(var(--chart-3))" name="Avg Balance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Counterparties - Credit Txns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Counterparty</th>
                    <th className="text-right py-2">Amount (₹)</th>
                    <th className="text-right py-2">Amount %</th>
                    <th className="text-right py-2">Txn Count</th>
                    <th className="text-right py-2">Txn %</th>
                  </tr>
                </thead>
                <tbody>
                  {topCounterparties.credit.map((cp, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{cp.name}</td>
                      <td className="text-right">{cp.amount.toLocaleString()}</td>
                      <td className="text-right">{cp.percentage}%</td>
                      <td className="text-right">{cp.txnCount}</td>
                      <td className="text-right">{cp.txnPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Counterparties - Debit Txns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Counterparty</th>
                    <th className="text-right py-2">Amount (₹)</th>
                    <th className="text-right py-2">Amount %</th>
                    <th className="text-right py-2">Txn Count</th>
                    <th className="text-right py-2">Txn %</th>
                  </tr>
                </thead>
                <tbody>
                  {topCounterparties.debit.map((cp, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{cp.name}</td>
                      <td className="text-right">{cp.amount.toLocaleString()}</td>
                      <td className="text-right">{cp.percentage}%</td>
                      <td className="text-right">{cp.txnCount}</td>
                      <td className="text-right">{cp.txnPercentage}%</td>
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

export default OverviewTab;
