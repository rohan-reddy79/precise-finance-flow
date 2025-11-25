import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface DailyBalanceTabProps {
  projectId: string;
}

const DailyBalanceTab = ({ projectId }: DailyBalanceTabProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Daily Balance Analysis</h2>
      
      <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
        <AlertCircle className="h-5 w-5" />
        <p>
          <strong>Balance data unavailable:</strong> Your statements don't include opening/closing balances. 
          All transaction amounts are accurate.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Day-wise Average Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Daily balance tracking requires opening/closing balance data from statements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyBalanceTab;
