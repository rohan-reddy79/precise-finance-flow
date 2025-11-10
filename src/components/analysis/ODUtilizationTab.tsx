import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ODUtilizationTabProps {
  projectId: string;
}

const ODUtilizationTab = ({ projectId }: ODUtilizationTabProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">OC/DD Utilization</h2>
      <Card>
        <CardHeader>
          <CardTitle>Overdraft Utilization Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No overdraft data available</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ODUtilizationTab;
