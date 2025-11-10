import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Shield, FileText, Zap, PieChart } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="p-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Precise
            </span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/app")}>
              Quick Upload
            </Button>
            <Button variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl font-bold mb-6 leading-tight">
          Transform Your Bank Statements <br />
          Into{" "}
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            Actionable Insights
          </span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
          Upload, analyze, and forecast your finances with AI-powered categorization,
          beautiful visualizations, and professional PDF reports.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Start Analyzing Free
          </Button>
          <Button size="lg" variant="outline">
            Watch Demo
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-card p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 rounded-lg bg-accent w-fit mb-4">
              <BarChart3 className="h-8 w-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Excel-Like Analysis</h3>
            <p className="text-muted-foreground">
              Powerful data grid with filtering, sorting, and inline editing. 
              Export to CSV/XLSX anytime.
            </p>
          </div>

          <div className="bg-card p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 rounded-lg bg-accent w-fit mb-4">
              <Zap className="h-8 w-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Auto-Categorization</h3>
            <p className="text-muted-foreground">
              AI-powered smart categorization learns from your edits and applies
              custom rules automatically.
            </p>
          </div>

          <div className="bg-card p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 rounded-lg bg-accent w-fit mb-4">
              <PieChart className="h-8 w-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Visual Insights</h3>
            <p className="text-muted-foreground">
              Beautiful charts showing spending by category, monthly trends, and
              top merchants at a glance.
            </p>
          </div>

          <div className="bg-card p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 rounded-lg bg-accent w-fit mb-4">
              <TrendingUp className="h-8 w-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3">6-Month Forecast</h3>
            <p className="text-muted-foreground">
              Predict future expenses based on historical patterns with confidence
              intervals and trend analysis.
            </p>
          </div>

          <div className="bg-card p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 rounded-lg bg-accent w-fit mb-4">
              <FileText className="h-8 w-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3">PDF Reports</h3>
            <p className="text-muted-foreground">
              Generate professional reports with category breakdowns, charts, and
              forecasts ready to share.
            </p>
          </div>

          <div className="bg-card p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 rounded-lg bg-accent w-fit mb-4">
              <Shield className="h-8 w-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Bank-Level Security</h3>
            <p className="text-muted-foreground">
              Your financial data is encrypted at rest and in transit with
              enterprise-grade security.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="bg-card p-12 rounded-2xl shadow-lg max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Master Your Finances?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands who've transformed their financial planning with Precise
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Precise Bank Statement Analyzer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
