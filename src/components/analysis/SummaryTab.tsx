import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { AddBalanceDialog } from "./AddBalanceDialog";

interface SummaryTabProps {
  projectId: string;
}

const SummaryTab = ({ projectId }: SummaryTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalCredit: 0,
    totalDebit: 0,
    netFlow: 0,
    startDate: '',
    endDate: '',
    openingBalance: null as number | null,
    closingBalance: null as number | null,
    earliestStatementDate: null as string | null,
  });
  const [isSafeBalanceAccount, setIsSafeBalanceAccount] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [editStatementId, setEditStatementId] = useState<string | null>(null);
  const [latestStatementId, setLatestStatementId] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, [projectId]);

  const loadSummary = async () => {
    try {
      // Get statements for this project
      const { data: statements } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('project_id', projectId);

      if (!statements || statements.length === 0) {
        setLoading(false);
        return;
      }

      const statementIds = statements.map(s => s.id);

      // Check if this is a SafeBalance account
      const hasSafeBalance = statements.some(s => 
        s.file_name?.toLowerCase().includes('safebalance')
      );
      setIsSafeBalanceAccount(hasSafeBalance);

      // Fetch all transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .in('statement_id', statementIds);

      if (!transactions || transactions.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate totals
      const totalCredit = transactions
        .filter(t => !t.is_debit)
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      const totalDebit = transactions
        .filter(t => t.is_debit)
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      const dates = transactions.map(t => new Date(t.transaction_date)).sort((a, b) => a.getTime() - b.getTime());

      // Extract balances from statements
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
      
      const openingBalance = earliestStatement?.opening_balance || null;
      const closingBalance = latestStatement?.closing_balance || null;

      // Store earliest statement ID for editing
      if (earliestStatement) {
        setEditStatementId(earliestStatement.id);
      }
      
      // Store latest statement ID for editing closing balance
      if (latestStatement) {
        setLatestStatementId(latestStatement.id);
      }

      setSummary({
        totalTransactions: transactions.length,
        totalCredit,
        totalDebit,
        netFlow: totalCredit - totalDebit,
        startDate: dates[0]?.toLocaleDateString() || '',
        endDate: dates[dates.length - 1]?.toLocaleDateString() || '',
        openingBalance,
        closingBalance,
        earliestStatementDate: earliestStatement?.statement_period_start || null,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading summary:', error);
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

  const hasBalanceData = summary.openingBalance !== null;

  return (
    <div className="space-y-6">
      <AddBalanceDialog 
        projectId={projectId}
        open={balanceDialogOpen}
        onOpenChange={(open) => {
          setBalanceDialogOpen(open);
          if (!open) setEditStatementId(null);
        }}
        onSuccess={loadSummary}
        editStatementId={editStatementId}
      />
      
      <h2 className="text-2xl font-bold">Financial Summary</h2>
      
      {/* Initial Balance Card - Always Show */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={hasBalanceData ? "" : "border-2 border-amber-500/30"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                {!hasBalanceData && <AlertCircle className="h-4 w-4 text-amber-500" />}
                <span>Initial Balance</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Balance tracking depends on your bank's statement format. {isSafeBalanceAccount && "Bank of America SafeBalance accounts don't include balance information in PDFs. "}You can manually add balances for accurate tracking.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {hasBalanceData && (
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  Auto-extracted
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasBalanceData ? (
              <>
                <p className="text-2xl font-bold text-blue-600">
                  {currencySymbol}{summary.openingBalance!.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  As of {summary.earliestStatementDate ? new Date(summary.earliestStatementDate).toLocaleDateString() : summary.startDate}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setBalanceDialogOpen(true);
                  }}
                  className="mt-2 h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Edit
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-600">
                  {isSafeBalanceAccount 
                    ? "Bank of America SafeBalance Account"
                    : "Balance Data Not Available"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSafeBalanceAccount 
                    ? "Your Bank of America SafeBalance account statements don't include balance information. This is normal for this account type. All transaction amounts are accurately tracked."
                    : "Our parser couldn't find opening/closing balance fields in your bank's PDF format. This doesn't affect transaction tracking—all credits and debits are captured correctly."}
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEditStatementId(null);
                    setBalanceDialogOpen(true);
                  }}
                  className="mt-2 h-8 text-xs"
                >
                  Add Balance Manually
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {summary.closingBalance !== null && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2 justify-between">
                <span>Closing Balance</span>
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  Auto-extracted
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {currencySymbol}{summary.closingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                As of {summary.endDate}
              </p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setEditStatementId(latestStatementId);
                  setBalanceDialogOpen(true);
                }}
                className="mt-2 h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Edit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Transaction Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.totalTransactions.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {currencySymbol}{summary.totalCredit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {currencySymbol}{summary.totalDebit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currencySymbol}{summary.netFlow.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Period Start</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{summary.startDate || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Period End</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{summary.endDate || 'N/A'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SummaryTab;
