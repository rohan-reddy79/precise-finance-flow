import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IrregularitiesTabProps {
  projectId: string;
}

const IrregularitiesTab = ({ projectId }: IrregularitiesTabProps) => {
  const irregularities = [
    { title: "Balance Mismatch Transactions", count: 0, severity: "high" },
    { title: "NEGATIVE COMPUTED BALANCE IN Debit TXNS", count: 0, severity: "high" },
    { title: "Parties involved in both Credit and Debit", count: 3, severity: "medium" },
    { title: "Suspicious RTGS Transactions", count: 0, severity: "high" },
    { title: "Suspicious IMPS Transactions", count: 1, severity: "medium" },
    { title: "All RTGS/NEFT/CHQ/IMPS/ECS Return Transactions", count: 2, severity: "high" },
    { title: "NEFT Credit transactions on bank holiday", count: 0, severity: "medium" },
    { title: "ATM WITHDRAWALS ABOVE ₹20,000", count: 4, severity: "low" },
    { title: "ATM withdrawals without cash", count: 0, severity: "high" },
    { title: "ATM Deposit Above 2L", count: 0, severity: "high" },
    { title: "CASH transactions on bank holiday", count: 1, severity: "medium" },
    { title: "Frequent Cash Deposits within 10 Days > 50,000", count: 2, severity: "medium" },
    { title: "Cash Deposits More Than Maximum Salary", count: 0, severity: "high" },
    { title: "Round figure Tax Payments", count: 1, severity: "low" },
    { title: "Salary Credit in IMPS/UPI", count: 0, severity: "medium" },
    { title: "Immediate big debit after Salary credit", count: 1, severity: "medium" },
    { title: "Salary utilized >50% in next 5 days", count: 0, severity: "low" },
    { title: "Big deposit followed by withdrawals on same/next day", count: 2, severity: "high" },
    { title: "Multiple deposits followed by big withdrawal", count: 1, severity: "high" },
    { title: "International wire transfers", count: 0, severity: "medium" },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-600 bg-red-50 dark:bg-red-950";
      case "medium": return "text-orange-600 bg-orange-50 dark:bg-orange-950";
      case "low": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Suspicious Statements</h2>
        <Alert className="w-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            {irregularities.filter(i => i.count > 0).length} irregularities detected
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {irregularities.map((item, idx) => (
          <Card key={idx} className={item.count > 0 ? getSeverityColor(item.severity) : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Severity: <span className="capitalize">{item.severity}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className="text-xs text-muted-foreground">Found</div>
                  </div>
                  {item.count > 0 && (
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IrregularitiesTab;
