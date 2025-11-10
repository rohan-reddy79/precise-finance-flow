import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LoanAnalysisTabProps {
  projectId: string;
}

const LoanAnalysisTab = ({ projectId }: LoanAnalysisTabProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Loan Analysis</h2>
      <Card>
        <CardHeader>
          <CardTitle>Loan Information & EMI Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No loan data available</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanAnalysisTab;
