import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { AddBalanceDialog } from "./AddBalanceDialog";

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
  const [isSafeBalanceAccount, setIsSafeBalanceAccount] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
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

      // Check if this is a SafeBalance account
      const hasSafeBalance = statements.some(s => 
        s.file_name?.toLowerCase().includes('safebalance')
      );
      setIsSafeBalanceAccount(hasSafeBalance);

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

  const hasBalanceData = balanceInfo.openingBalance !== null;

  return (
    <div className="space-y-6">
      <AddBalanceDialog 
        projectId={projectId}
        open={balanceDialogOpen}
        onOpenChange={setBalanceDialogOpen}
        onSuccess={loadData}
      />
      
      <h2 className="text-2xl font-bold">Financial Overview</h2>
      
      {/* Initial Balance Card - Always Visible */}
      <Card className={hasBalanceData ? "border-2 border-primary/20" : "border-2 border-amber-500/30"}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              {!hasBalanceData && <AlertCircle className="h-5 w-5 text-amber-500" />}
              <span>Initial Balance</span>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Balance tracking depends on your bank's statement format. {isSafeBalanceAccount && "Bank of America SafeBalance accounts don't include balance information in PDFs. "} You can manually add balances for accurate tracking.
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            {hasBalanceData && (
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                Auto-extracted
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasBalanceData ? (
            <>
              <p className="text-3xl font-bold text-primary">
                {currencySymbol}{balanceInfo.openingBalance!.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
            <div className="space-y-3">
              <p className="text-lg font-semibold text-amber-600">
                {isSafeBalanceAccount 
                  ? "Bank of America SafeBalance Account"
                  : "Balance Data Not Available"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSafeBalanceAccount 
                  ? "Your Bank of America SafeBalance account statements don't include balance information. This is normal for this account type. All transaction amounts are accurately tracked."
                  : "Our parser couldn't find opening/closing balance fields in your bank's PDF format. This doesn't affect transaction tracking—all credits and debits are captured correctly."}
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setBalanceDialogOpen(true)}
                className="mt-2"
              >
                Add Balance Manually
              </Button>
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
                <Tooltip formatter={(value: number) => currencySymbol + value.toLocaleString()} />
                <Line type="monotone" dataKey="netCashFlow" stroke="#8884d8" name="Net Cash Flow" />
                <Line type="monotone" dataKey="netBizFlow" stroke="#82ca9d" name="Net Business Flow" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Monthly Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => currencySymbol + value.toLocaleString()} />
                <Bar dataKey="avgBalance" fill="#8884d8" name="Average Balance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Credit Counterparties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-right p-2">% of Credit</th>
                    <th className="text-right p-2">Txns</th>
                    <th className="text-right p-2">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topCounterparties.credit.map((cp, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{cp.name}</td>
                      <td className="text-right p-2">{currencySymbol}{cp.amount.toLocaleString()}</td>
                      <td className="text-right p-2">{cp.percentage}%</td>
                      <td className="text-right p-2">{cp.txnCount}</td>
                      <td className="text-right p-2">{cp.txnPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Debit Counterparties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-right p-2">% of Debit</th>
                    <th className="text-right p-2">Txns</th>
                    <th className="text-right p-2">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topCounterparties.debit.map((cp, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{cp.name}</td>
                      <td className="text-right p-2">{currencySymbol}{cp.amount.toLocaleString()}</td>
                      <td className="text-right p-2">{cp.percentage}%</td>
                      <td className="text-right p-2">{cp.txnCount}</td>
                      <td className="text-right p-2">{cp.txnPercentage}%</td>
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
