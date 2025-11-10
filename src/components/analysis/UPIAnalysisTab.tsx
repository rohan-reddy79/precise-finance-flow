import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UPIAnalysisTabProps {
  projectId: string;
}

const UPIAnalysisTab = ({ projectId }: UPIAnalysisTabProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">UPI Transactions Analysis</h2>
      <Card>
        <CardHeader>
          <CardTitle>UPI Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">UPI analysis loading...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UPIAnalysisTab;
