import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileText, TrendingUp, LogOut, PieChart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [statements, setStatements] = useState<any[]>([]);
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
        .limit(5);

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
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20MB");
      return;
    }

    toast.success("File uploaded! Processing will be available soon.");
    // TODO: Implement file processing
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
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
          <p className="text-xl text-muted-foreground">
            Upload a statement to get started with your financial analysis
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
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, CSV, or XLSX (Max 20MB)
                  </p>
                </Label>
              </div>
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
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transactions</span>
                        <span className="font-medium">{statement.total_transactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount</span>
                        <span className="font-medium">
                          ${Math.abs(statement.total_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      View Analysis
                    </Button>
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
