import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { TrendingUp, Shield, BarChart3 } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/app");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;
        toast.success("Account created! Please check your email to verify.");
        navigate("/app");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Precise
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-12 items-center">
          {/* Left Side - Marketing */}
          <div className="hidden md:block space-y-8">
            <div>
              <h1 className="text-5xl font-bold mb-4 leading-tight">
                Master Your <br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Financial Future
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Analyze bank statements with AI-powered insights, smart categorization, and forecasting.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-accent">
                  <BarChart3 className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Smart Analytics</h3>
                  <p className="text-muted-foreground">
                    Visualize spending patterns and get actionable insights
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-accent">
                  <Shield className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Bank-Level Security</h3>
                  <p className="text-muted-foreground">
                    Your data is encrypted and protected with enterprise security
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-accent">
                  <TrendingUp className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Future Forecasting</h3>
                  <p className="text-muted-foreground">
                    Predict expenses and plan budgets with 6-month projections
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>{isLogin ? "Welcome Back" : "Get Started"}</CardTitle>
              <CardDescription>
                {isLogin
                  ? "Sign in to access your financial dashboard"
                  : "Create an account to start analyzing your finances"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground">
        <p>© 2025 Precise Bank Statement Analyzer. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Auth;
