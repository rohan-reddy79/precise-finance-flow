import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface OverviewTabProps {
  projectId: string;
}

const OverviewTab = ({ projectId }: OverviewTabProps) => {
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<any>({});
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [topCounterparties, setTopCounterparties] = useState<{ credit: any[], debit: any[] }>({ credit: [], debit: [] });
  const [currency, setCurrency] = useState<string>('USD');
  const [balanceInfo, setBalanceInfo] = useState<{
    openingBalance: number | null;
    closingBalance: number | null;
    earliestStatementDate: string | null;
  }>({ openingBalance: null, closingBalance: null, earliestStatementDate: null });
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      // Get statement IDs for this project
      const { data: statements } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('project_id', projectId);

      if (!statements || statements.length === 0) {
        setLoading(false);
        return;
      }

      const statementIds = statements.map(s => s.id);
      setCurrency(statements[0]?.currency || 'USD');

      // Extract balance information
      const earliestStatement = statements
        .filter(s => s.statement_period_start)
        .sort((a, b) => 
          new Date(a.statement_period_start!).getTime() - 
          new Date(b.statement_period_start!).getTime()
        )[0];

      const latestStatement = statements
        .filter(s => s.closing_balance !== null)
        .sort((a, b) => 
          new Date(b.statement_period_start!).getTime() - 
          new Date(a.statement_period_start!).getTime()
        )[0];

      setBalanceInfo({
        openingBalance: earliestStatement?.opening_balance || null,
        closingBalance: latestStatement?.closing_balance || null,
        earliestStatementDate: earliestStatement?.statement_period_start || null,
      });

      // Fetch all transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .in('statement_id', statementIds);

      if (!transactions || transactions.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate monthly aggregates
      const monthlyMap = new Map<string, { credit: number, debit: number }>();
      transactions.forEach(txn => {
        const date = new Date(txn.transaction_date);
        const monthKey = date.toLocaleString('default', { month: 'short' });
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { credit: 0, debit: 0 });
        }
        
        const monthly = monthlyMap.get(monthKey)!;
        if (txn.is_debit) {
          monthly.debit += parseFloat(txn.amount.toString());
        } else {
          monthly.credit += parseFloat(txn.amount.toString());
        }
      });

      const monthlyDataArray = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        netCashFlow: data.credit - data.debit,
        netBizFlow: data.credit - data.debit,
        avgBalance: data.credit,
      }));

      setMonthlyData(monthlyDataArray);

      // Calculate top counterparties
      const creditCounterparties = new Map<string, { amount: number, count: number }>();
      const debitCounterparties = new Map<string, { amount: number, count: number }>();

      transactions.forEach(txn => {
        if (!txn.merchant) return;
        
        const map = txn.is_debit ? debitCounterparties : creditCounterparties;
        if (!map.has(txn.merchant)) {
          map.set(txn.merchant, { amount: 0, count: 0 });
        }
        const entry = map.get(txn.merchant)!;
        entry.amount += parseFloat(txn.amount.toString());
        entry.count += 1;
      });

      const totalCredit = transactions.filter(t => !t.is_debit).reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const totalDebit = transactions.filter(t => t.is_debit).reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const totalTxns = transactions.length;

      const creditTop = Array.from(creditCounterparties.entries())
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 10)
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          percentage: totalCredit > 0 ? Math.round((data.amount / totalCredit) * 100) : 0,
          txnCount: data.count,
          txnPercentage: totalTxns > 0 ? Math.round((data.count / totalTxns) * 100) : 0,
        }));

      const debitTop = Array.from(debitCounterparties.entries())
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 10)
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          percentage: totalDebit > 0 ? Math.round((data.amount / totalDebit) * 100) : 0,
          txnCount: data.count,
          txnPercentage: totalTxns > 0 ? Math.round((data.count / totalTxns) * 100) : 0,
        }));

      setTopCounterparties({ credit: creditTop, debit: debitTop });
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
      {/* Initial Balance Card - Always Visible */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {balanceInfo.openingBalance !== null ? (
              <>Initial Balance</>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Initial Balance - Not Available
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balanceInfo.openingBalance !== null ? (
            <>
              <p className="text-3xl font-bold text-primary">
                {currencySymbol}{balanceInfo.openingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                As of {balanceInfo.earliestStatementDate ? new Date(balanceInfo.earliestStatementDate).toLocaleDateString() : 'statement start'}
              </p>
              {balanceInfo.closingBalance !== null && (
                <p className="text-sm text-muted-foreground mt-1">
                  Closing: {currencySymbol}{balanceInfo.closingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-semibold text-muted-foreground">Balance data not extracted from your statements</p>
              <p className="text-sm text-muted-foreground">
                Our parser couldn't find opening/closing balance fields in your bank's PDF format. This doesn't affect transaction tracking—all credits and debits are captured correctly.
              </p>
              <p className="text-xs text-muted-foreground italic mt-2">
                Note: If you need balance tracking, consider the first transaction date as your reference point.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
                <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
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
                <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
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
                    <th className="text-right py-2">Amount ({currencySymbol})</th>
                    <th className="text-right py-2">Amount %</th>
                    <th className="text-right py-2">Txn Count</th>
                    <th className="text-right py-2">Txn %</th>
                  </tr>
                </thead>
                <tbody>
                  {topCounterparties.credit.map((cp, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{cp.name}</td>
                      <td className="text-right">{currencySymbol}{cp.amount.toLocaleString()}</td>
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
                    <th className="text-right py-2">Amount ({currencySymbol})</th>
                    <th className="text-right py-2">Amount %</th>
                    <th className="text-right py-2">Txn Count</th>
                    <th className="text-right py-2">Txn %</th>
                  </tr>
                </thead>
                <tbody>
                  {topCounterparties.debit.map((cp, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{cp.name}</td>
                      <td className="text-right">{currencySymbol}{cp.amount.toLocaleString()}</td>
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
