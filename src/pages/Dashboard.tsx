import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileText, TrendingUp, LogOut, PieChart, FolderOpen, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [statements, setStatements] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchStatements();
    }
  }, [user]);

  const fetchStatements = async () => {
    try {
      const { data, error } = await supabase
        .from("bank_statements")
        .select("*")
        .order("upload_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      setStatements(data || []);
    } catch (error: any) {
      console.error("Error fetching statements:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF, CSV, or XLSX file");
      e.target.value = ""; // Reset input
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20MB");
      e.target.value = ""; // Reset input
      return;
    }

    if (!user) {
      toast.error("You must be logged in to upload files");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from("bank-statements")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      setUploadProgress(60);

      // Create database record
      const { data: statementData, error: dbError } = await supabase
        .from("bank_statements")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      setUploadProgress(80);

      toast.success("Upload Complete!", {
        description: "Processing your bank statement...",
      });

      // Trigger processing
      const { error: processError } = await supabase.functions.invoke('process-bank-statement', {
        body: { statementId: statementData.id }
      });

      if (processError) {
        console.error('Processing error:', processError);
        toast.info("Processing Started", {
          description: "Statement processing is in progress. Refresh to see results.",
        });
      } else {
        toast.success("Success!", {
          description: "Bank statement processed successfully",
        });
      }

      setUploadProgress(100);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Refresh after a short delay to allow processing to complete
      setTimeout(() => {
        fetchStatements();
      }, 2000);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Precise
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="default" onClick={() => navigate("/projects")}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Projects
              </Button>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Info Banner */}
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">💡 New: Project-Based Workflow</h3>
                <p className="text-muted-foreground mb-4">
                  We now recommend using <strong>Projects</strong> to organize your bank statements. 
                  Projects give you access to 18+ analysis templates including AML Analysis, Cash Flow, 
                  Counterparty Analysis, and more!
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => navigate("/projects")}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Go to Projects
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/projects")}>
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Quick Upload</h1>
          <p className="text-xl text-muted-foreground">
            Upload a statement here or use Projects for full analysis capabilities
          </p>
        </div>

        {/* Upload Card */}
        <Card className="mb-12 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-6 w-6 text-primary" />
              Upload Bank Statement
            </CardTitle>
            <CardDescription>
              Support for PDF, CSV, and XLSX files up to 20MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`border-2 border-dashed border-border rounded-lg p-12 text-center transition-colors ${
                uploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary cursor-pointer"
              }`}>
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Label htmlFor="file-upload" className={uploading ? "cursor-not-allowed" : "cursor-pointer"}>
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${uploading ? "text-muted-foreground animate-pulse" : "text-muted-foreground"}`} />
                  <p className="text-lg font-medium mb-2">
                    {uploading ? "Uploading..." : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, CSV, or XLSX (Max 20MB)
                  </p>
                </Label>
              </div>
              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Uploading: {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Analyses */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Recent Analyses</h2>
          {statements.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg text-muted-foreground mb-2">
                  No analyses yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload a bank statement to see your analysis here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {statements.map((statement) => (
                <Card
                  key={statement.id}
                  className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {statement.file_name}
                    </CardTitle>
                    <CardDescription>
                      Uploaded {new Date(statement.upload_date).toLocaleDateString()}
                      {statement.processing_status && (
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statement.processing_status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : statement.processing_status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : statement.processing_status === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {statement.processing_status}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statement.parsing_errors && (
                      <p className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded">
                        {statement.parsing_errors}
                      </p>
                    )}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transactions</span>
                        <span className="font-medium">{statement.total_transactions || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount</span>
                        <span className="font-medium">
                          £{statement.total_amount?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      {statement.statement_period_start && statement.statement_period_end && (
                        <div className="flex justify-between text-xs pt-2 border-t">
                          <span className="text-muted-foreground">Period</span>
                          <span className="font-medium">
                            {new Date(statement.statement_period_start).toLocaleDateString()} - {new Date(statement.statement_period_end).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {statement.project_id ? (
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => navigate(`/analysis/${statement.project_id}`)}
                      >
                        View Analysis
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => {
                          toast.info("Migrate to a project first", {
                            description: "Go to Projects page to organize this statement"
                          });
                          navigate("/projects");
                        }}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Move to Project
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="shadow-sm">
            <CardHeader>
              <PieChart className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Category Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatic categorization with visual breakdowns of your spending
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track spending patterns over time with beautiful charts
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">PDF Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Generate professional reports for sharing and archiving
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
