import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Upload, FileText, TrendingUp, BarChart3, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectUpload from "@/components/ProjectUpload";
import ProjectReport from "@/components/ProjectReport";
import ProjectPredictions from "@/components/ProjectPredictions";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface BankStatement {
  id: string;
  file_name: string;
  file_path: string;
  upload_date: string;
  processing_status: string;
  total_transactions: number;
  total_amount: number;
  parsing_errors?: string | null;
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatingPredictions, setGeneratingPredictions] = useState(false);
  const [reprocessing, setReprocessing] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [currency, setCurrency] = useState<string>('USD');
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  const navigate = useNavigate();
  const { toast } = useToast();

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

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const { data: statementsData, error: statementsError } = await supabase
        .from("bank_statements")
        .select("*")
        .eq("project_id", projectId)
        .order("upload_date", { ascending: false });

      if (statementsError) throw statementsError;
      setStatements(statementsData || []);
      setCurrency((statementsData && statementsData[0]?.currency) || 'USD');
    } catch (error: any) {
      toast({
        title: "Error loading project",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-project-report", {
        body: { projectId },
      });

      if (error) throw error;

      toast({
        title: "Report generated",
        description: "Your financial analysis report is ready",
      });
    } catch (error: any) {
      const errorMessage = error.message?.includes('INSUFFICIENT_DATA') 
        ? 'No processed data available. Please upload and process statements first.'
        : error.message || 'Failed to generate report';
      
      toast({
        title: "Error generating report",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const generatePredictions = async () => {
    setGeneratingPredictions(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-expenses", {
        body: { projectId },
      });

      if (error) throw error;

      toast({
        title: "Predictions generated",
        description: "6-month expense predictions are ready",
      });
    } catch (error: any) {
      toast({
        title: "Error generating predictions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingPredictions(false);
    }
  };

  const reprocessStatement = async (statementId: string) => {
    setReprocessing(statementId);
    try {
      const { error } = await supabase.functions.invoke('process-bank-statement', {
        body: { statementId }
      });

      if (error) throw error;

      toast({
        title: "Reprocessing started",
        description: "Statement is being reprocessed",
      });

      // Reload after a delay
      setTimeout(() => {
        loadProject();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Reprocessing failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReprocessing(null);
    }
  };

  const deleteStatement = async (statement: BankStatement) => {
    if (!confirm(`Delete "${statement.file_name}"? This will also delete all associated transactions.`)) {
      return;
    }

    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('bank-statements')
        .remove([statement.file_path]);

      if (storageError) throw storageError;

      // Delete transactions (will cascade via RLS)
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('statement_id', statement.id);

      if (transactionsError) throw transactionsError;

      // Delete statement record
      const { error: statementError } = await supabase
        .from('bank_statements')
        .delete()
        .eq('id', statement.id);

      if (statementError) throw statementError;

      toast({
        title: "Statement deleted",
        description: "Bank statement and associated transactions removed",
      });

      loadProject();
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteAllFailed = async () => {
    const failedStatements = statements.filter(s => s.processing_status === 'failed');
    
    if (failedStatements.length === 0) {
      toast({
        title: "No failed statements",
        description: "There are no failed statements to delete",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete all ${failedStatements.length} failed statements? This cannot be undone.`)) {
      return;
    }

    setDeletingAll(true);
    try {
      for (const statement of failedStatements) {
        // Delete file from storage
        await supabase.storage
          .from('bank-statements')
          .remove([statement.file_path]);

        // Delete associated transactions
        await supabase
          .from('transactions')
          .delete()
          .eq('statement_id', statement.id);

        // Delete statement record
        await supabase
          .from('bank_statements')
          .delete()
          .eq('id', statement.id);
      }

      toast({
        title: "Failed statements deleted",
        description: `Successfully deleted ${failedStatements.length} failed statements`,
      });

      loadProject();
    } catch (error: any) {
      toast({
        title: "Error deleting statements",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingAll(false);
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-foreground">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bank Statements</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statements.length}</div>
              <p className="text-xs text-muted-foreground">Uploaded files</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statements.reduce((sum, s) => sum + (s.total_transactions || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">Processed entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currencySymbol}{statements.reduce((sum, s) => sum + parseFloat(s.total_amount?.toString() || "0"), 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Total processed</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Button onClick={() => navigate(`/analysis/${projectId}`)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Open Full Analysis Dashboard
          </Button>
        </div>

        <Tabs defaultValue="statements" className="space-y-6">
          <TabsList>
            <TabsTrigger value="statements">
              <Upload className="h-4 w-4 mr-2" />
              Statements
            </TabsTrigger>
            <TabsTrigger value="report">
              <FileText className="h-4 w-4 mr-2" />
              Analysis Report
            </TabsTrigger>
            <TabsTrigger value="predictions">
              <TrendingUp className="h-4 w-4 mr-2" />
              Predictions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Bank Statements</CardTitle>
                <CardDescription>
                  Upload up to 12 bank statements in CSV, Excel, or PDF format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectUpload projectId={projectId!} onUploadComplete={loadProject} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uploaded Statements</CardTitle>
              </CardHeader>
              <CardContent>
                {statements.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No statements uploaded yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {statements.map((statement) => (
                      <div
                        key={statement.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium">{statement.file_name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Status: <span className={
                                statement.processing_status === 'completed' ? 'text-green-600' :
                                statement.processing_status === 'failed' ? 'text-red-600' :
                                'text-yellow-600'
                              }>{statement.processing_status}</span></span>
                              {statement.processing_status === 'completed' && (
                                <span>{statement.total_transactions} transactions</span>
                              )}
                            </div>
                            {statement.parsing_errors && (
                              <p className="text-sm text-red-600 mt-1">Error: {statement.parsing_errors}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {(statement.processing_status === 'failed' || statement.processing_status === 'pending') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reprocessStatement(statement.id)}
                              disabled={reprocessing === statement.id}
                            >
                              {reprocessing === statement.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Reprocess
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteStatement(statement)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="text-sm text-muted-foreground">
                            {new Date(statement.upload_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Financial Analysis Report</CardTitle>
                    <CardDescription>
                      AI-powered analysis of your financial data
                    </CardDescription>
                  </div>
                  <Button onClick={generateReport} disabled={generatingReport || statements.length === 0}>
                    {generatingReport && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Generate Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ProjectReport projectId={projectId!} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>6-Month Expense Predictions</CardTitle>
                    <CardDescription>
                      AI-powered forecast of your future expenses
                    </CardDescription>
                  </div>
                  <Button onClick={generatePredictions} disabled={generatingPredictions || statements.length === 0}>
                    {generatingPredictions && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Generate Predictions
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ProjectPredictions projectId={projectId!} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetail;
