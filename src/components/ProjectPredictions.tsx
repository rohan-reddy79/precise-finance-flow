import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

interface ProjectPredictionsProps {
  projectId: string;
}

interface Prediction {
  prediction_month: string;
  predicted_amount: number;
  category: string;
  confidence_score: number;
}

const ProjectPredictions = ({ projectId }: ProjectPredictionsProps) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    loadPredictions();
    loadCurrency();
  }, [projectId]);

  const loadCurrency = async () => {
    try {
      const { data } = await supabase
        .from("bank_statements")
        .select("currency")
        .eq("project_id", projectId)
        .limit(1)
        .single();
      
      if (data?.currency) {
        setCurrency(data.currency);
      }
    } catch (error) {
      console.error("Error loading currency:", error);
    }
  };

  const loadPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from("expense_predictions")
        .select("*")
        .eq("project_id", projectId)
        .order("prediction_month", { ascending: true });

      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error("Error loading predictions:", error);
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

  if (predictions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No predictions generated yet.</p>
        <p className="text-sm mt-2">Click "Generate Predictions" to forecast expenses.</p>
      </div>
    );
  }

  // Aggregate by month
  const monthlyTotals = predictions.reduce((acc, pred) => {
    const month = new Date(pred.prediction_month).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    
    if (!acc[month]) {
      acc[month] = { 
        month, 
        total: 0, 
        confidence: pred.confidence_score 
      };
    }
    
    acc[month].total += parseFloat(pred.predicted_amount.toString());
    return acc;
  }, {} as Record<string, { month: string; total: number; confidence: number }>);

  const chartData = Object.values(monthlyTotals);

  // Category breakdown for next month
  const nextMonth = predictions.filter(p => {
    const predMonth = new Date(p.prediction_month);
    const now = new Date();
    return predMonth.getMonth() === (now.getMonth() + 1) % 12;
  });

  const categoryData = nextMonth.reduce((acc, pred) => {
    const category = pred.category || 'Other';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += parseFloat(pred.predicted_amount.toString());
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryData).map(([category, amount]) => ({
    category,
    amount
  }));

  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'INR': '₹',
    'GBP': '£',
    'EUR': '€'
  };
  const currencySymbol = currencySymbols[currency] || currency;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>6-Month Expense Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Predicted Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chartData.map((data) => (
              <div key={data.month} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{data.month}</p>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {data.confidence}%
                  </p>
                </div>
                <p className="text-2xl font-bold">{currencySymbol}{data.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {categoryChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next Month - Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectPredictions;
