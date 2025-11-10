import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyBalanceTabProps {
  projectId: string;
}

const DailyBalanceTab = ({ projectId }: DailyBalanceTabProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Daily Balance Analysis</h2>
      <Card>
        <CardHeader>
          <CardTitle>Day-wise Average Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Daily balance data loading...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyBalanceTab;
