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
