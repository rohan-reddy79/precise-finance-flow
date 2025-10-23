import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProjectReportProps {
  projectId: string;
}

interface ReportData {
  summary: string;
  insights: string[];
  patterns: string;
  recommendations: string[];
  healthScore: number;
  totalIncome: number;
  totalExpenses: number;
  categoryBreakdown: Record<string, number>;
  monthlyTrends: Record<string, number>;
  transactionCount: number;
  currency?: string;
}

const ProjectReport = ({ projectId }: ProjectReportProps) => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [projectId]);

  const loadReport = async () => {
    try {
      const { data, error } = await supabase
        .from("project_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data && data.report_data) {
        setReport(data.report_data as unknown as ReportData);
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No report generated yet.</p>
        <p className="text-sm mt-2">Click "Generate Report" to create an analysis.</p>
      </div>
    );
  }

  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'INR': '₹',
    'GBP': '£',
    'EUR': '€'
  };
  const currency = report.currency || 'USD';
  const currencySymbol = currencySymbols[currency] || currency;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={report.healthScore} className="h-3" />
            <p className="text-2xl font-bold text-center">{report.healthScore}/100</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{report.summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {currencySymbol}{report.totalIncome.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {currencySymbol}{report.totalExpenses.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Net</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${(report.totalIncome - report.totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currencySymbol}{(report.totalIncome - report.totalExpenses).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {report.insights.map((insight, index) => (
              <li key={index} className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(report.categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{category}</span>
                    <span className="font-medium">
                      {currencySymbol}{amount.toFixed(2)} ({((amount / report.totalExpenses) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={(amount / report.totalExpenses) * 100} className="h-2" />
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{report.patterns}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {report.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <span className="text-primary mr-2">{index + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectReport;
