import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AMLAnalysisTabProps {
  projectId: string;
}

const AMLAnalysisTab = ({ projectId }: AMLAnalysisTabProps) => {
  const riskScore = 35; // Lower is better
  
  const metrics = [
    { label: "Daily Avg Balance", value: "₹52,450" },
    { label: "Max Balance", value: "₹98,750" },
    { label: "Min Balance", value: "₹12,300" },
    { label: "Days Gap (Max-Min)", value: "15 days" },
    { label: "Debit Transactions", value: "145" },
    { label: "Credit Transactions", value: "98" },
    { label: "Longest Inactive Period", value: "7 days" },
  ];

  const suspiciousActivities = [
    { activity: "International wire transfers", count: 0 },
    { activity: "Big deposit followed by withdrawals", count: 2 },
    { activity: "Multiple deposits followed by big withdrawal", count: 1 },
    { activity: "Cash Deposits More Than Maximum Salary", count: 0 },
    { activity: "ATM Deposit Above 2L", count: 0 },
    { activity: "Cheque transactions on bank holiday", count: 1 },
  ];

  const monthlyData = [
    { month: "Jan", deposits: 85000, withdrawals: 72000 },
    { month: "Feb", deposits: 92000, withdrawals: 78000 },
    { month: "Mar", deposits: 88000, withdrawals: 85000 },
    { month: "Apr", deposits: 95000, withdrawals: 82000 },
    { month: "May", deposits: 91000, withdrawals: 79000 },
    { month: "Jun", deposits: 97000, withdrawals: 88000 },
  ];

  const activityData = [
    { month: "Jan", maxBal: 98750, minBal: 45200, gap: 12 },
    { month: "Feb", maxBal: 105000, minBal: 52300, gap: 8 },
    { month: "Mar", maxBal: 95200, minBal: 48900, gap: 15 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AML Risk Analysis</h2>
        <Card className="w-auto">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{riskScore}</div>
              <div className="text-xs text-muted-foreground">Risk Score</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {metrics.map((metric, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold">{metric.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{metric.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Deposits vs Withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
              <Line type="monotone" dataKey="deposits" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Deposits" />
              <Line type="monotone" dataKey="withdrawals" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Withdrawals" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Suspicious Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suspiciousActivities.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">{item.activity}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{item.count}</span>
                    {item.count > 0 && (
                      <Button size="sm" variant="outline">View</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Activity Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Month</th>
                    <th className="text-right p-2">Max Balance</th>
                    <th className="text-right p-2">Min Balance</th>
                    <th className="text-right p-2">Days Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {activityData.map((data, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{data.month}</td>
                      <td className="text-right p-2">₹{data.maxBal.toLocaleString()}</td>
                      <td className="text-right p-2">₹{data.minBal.toLocaleString()}</td>
                      <td className="text-right p-2">{data.gap} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AMLAnalysisTab;
