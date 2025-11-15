import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AnalysisNav from "@/components/analysis/AnalysisNav";
import OverviewTab from "@/components/analysis/OverviewTab";
import SummaryTab from "@/components/analysis/SummaryTab";
import TransactionsTab from "@/components/analysis/TransactionsTab";
import IrregularitiesTab from "@/components/analysis/IrregularitiesTab";
import AMLAnalysisTab from "@/components/analysis/AMLAnalysisTab";
import BizCashFlowTab from "@/components/analysis/BizCashFlowTab";
import MonthlySummaryTab from "@/components/analysis/MonthlySummaryTab";
import CounterPartyTab from "@/components/analysis/CounterPartyTab";
import CounterPartyMonthlyTab from "@/components/analysis/CounterPartyMonthlyTab";
import CategoriesTab from "@/components/analysis/CategoriesTab";
import ChequeReturnTab from "@/components/analysis/ChequeReturnTab";
import RecurringTab from "@/components/analysis/RecurringTab";
import LoanAnalysisTab from "@/components/analysis/LoanAnalysisTab";
import DailyBalanceTab from "@/components/analysis/DailyBalanceTab";
import DuplicatesTab from "@/components/analysis/DuplicatesTab";
import SalariesTab from "@/components/analysis/SalariesTab";
import UPIAnalysisTab from "@/components/analysis/UPIAnalysisTab";
import ODUtilizationTab from "@/components/analysis/ODUtilizationTab";

interface Project {
  id: string;
  name: string;
  description: string | null;
}

const Analysis = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProcessedData, setHasProcessedData] = useState(true);
  const [processingStatements, setProcessingStatements] = useState(0);
  const [failedStatements, setFailedStatements] = useState<string[]>([]);
  
  const activeTab = searchParams.get("tab") || "overview";

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      setProject(data);

      // Check if we have processed data
      const { data: statements } = await supabase
        .from("bank_statements")
        .select("id, processing_status, total_transactions")
        .eq("project_id", projectId);

      if (statements) {
        const completed = statements.filter(s => s.processing_status === 'completed');
        const processing = statements.filter(s => s.processing_status === 'processing' || s.processing_status === 'pending');
        const failed = statements.filter(s => s.processing_status === 'failed');
        const totalTransactions = completed.reduce((sum, s) => sum + (s.total_transactions || 0), 0);
        
        setHasProcessedData(totalTransactions > 0);
        setProcessingStatements(processing.length);
        setFailedStatements(failed.map(f => f.id));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reprocessFailed = async () => {
    if (failedStatements.length === 0) return;
    try {
      await Promise.all(
        failedStatements.map((id) =>
          supabase.functions.invoke('process-bank-statement', { body: { statementId: id } })
        )
      );
      toast({ title: 'Reprocessing started', description: `${failedStatements.length} statement(s) queued` });
      // Refresh after a short delay
      setTimeout(loadProject, 2000);
    } catch (e: any) {
      toast({ title: 'Reprocess failed', description: e.message, variant: 'destructive' });
    }
  };
  if (loading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <p className="text-sm text-muted-foreground">Bank Statement Analyser</p>
            </div>
          </div>
          <AnalysisNav activeTab={activeTab} projectId={projectId!} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {!hasProcessedData && (
          <div className="mb-6 p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">No Processed Data Yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {processingStatements > 0 
                    ? `${processingStatements} statement(s) are currently being processed. Please refresh in a moment.`
                    : 'Upload bank statements to see analysis data here.'}
                </p>
              </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
                    View Statements
                  </Button>
                  {failedStatements.length > 0 && (
                    <Button variant="outline" size="sm" onClick={reprocessFailed}>
                      Reprocess failed ({failedStatements.length})
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={loadProject}>
                    Refresh
                  </Button>
                </div>
            </div>
          </div>
        )}
        
        {activeTab === "overview" && <OverviewTab projectId={projectId!} />}
        {activeTab === "summary" && <SummaryTab projectId={projectId!} />}
        {activeTab === "transactions" && <TransactionsTab projectId={projectId!} />}
        {activeTab === "irregularities" && <IrregularitiesTab projectId={projectId!} />}
        {activeTab === "aml" && <AMLAnalysisTab projectId={projectId!} />}
        {activeTab === "bizcashflow" && <BizCashFlowTab projectId={projectId!} />}
        {activeTab === "monthlysummary" && <MonthlySummaryTab projectId={projectId!} />}
        {activeTab === "counterparty" && <CounterPartyTab projectId={projectId!} />}
        {activeTab === "counterpartymonthly" && <CounterPartyMonthlyTab projectId={projectId!} />}
        {activeTab === "categories" && <CategoriesTab projectId={projectId!} />}
        {activeTab === "chequereturn" && <ChequeReturnTab projectId={projectId!} />}
        {activeTab === "recurring" && <RecurringTab projectId={projectId!} />}
        {activeTab === "loananalysis" && <LoanAnalysisTab projectId={projectId!} />}
        {activeTab === "dailybalance" && <DailyBalanceTab projectId={projectId!} />}
        {activeTab === "duplicates" && <DuplicatesTab projectId={projectId!} />}
        {activeTab === "salaries" && <SalariesTab projectId={projectId!} />}
        {activeTab === "upianalysis" && <UPIAnalysisTab projectId={projectId!} />}
        {activeTab === "odutilization" && <ODUtilizationTab projectId={projectId!} />}
      </div>
    </div>
  );
};

export default Analysis;
