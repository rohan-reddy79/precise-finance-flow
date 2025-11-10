import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DuplicatesTabProps {
  projectId: string;
}

const DuplicatesTab = ({ projectId }: DuplicatesTabProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Duplicate Transactions</h2>
      <Card>
        <CardHeader>
          <CardTitle>Potential Duplicates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No duplicates detected</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DuplicatesTab;
