import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SalariesTabProps {
  projectId: string;
}

const SalariesTab = ({ projectId }: SalariesTabProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Salaries Paid Analysis</h2>
      <Card>
        <CardHeader>
          <CardTitle>Employee Salary Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No salary data available</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalariesTab;
