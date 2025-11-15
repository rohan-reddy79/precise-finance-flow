import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";

interface ChequeReturnTabProps {
  projectId: string;
}

const ChequeReturnTab = ({ projectId }: ChequeReturnTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const summary = {
    totalReturned: 3,
    totalReturnAmount: 45000,
    avgReturnAmount: 15000,
    maxReturnAmount: 25000,
    mostCommonReason: "Insufficient Funds",
    daysWithMostReturns: "15-Jan-2020",
  };

  const returnedCheques = [
    { date: "2020-01-15", amount: 25000, party: "Vendor XYZ", bank: "HDFC Bank", chequeNum: "123456", reason: "Insufficient Funds", returnedBy: "HDFC Bank", penalty: 500 },
    { date: "2020-02-22", amount: 12000, party: "ABC Supplier", bank: "ICICI Bank", chequeNum: "789012", reason: "Signature Mismatch", returnedBy: "ICICI Bank", penalty: 350 },
    { date: "2020-03-10", amount: 8000, party: "Service Provider", bank: "SBI", chequeNum: "345678", reason: "Account Closed", returnedBy: "SBI", penalty: 250 },
  ];

  const reasonsBreakdown = [
    { reason: "Insufficient Funds", count: 1, percentage: 33 },
    { reason: "Signature Mismatch", count: 1, percentage: 33 },
    { reason: "Account Closed", count: 1, percentage: 33 },
    { reason: "Other", count: 0, percentage: 0 },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Cheque Return Analysis</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{summary.totalReturned}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Returned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold">{currencySymbol}{summary.totalReturnAmount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Amount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold">{currencySymbol}{summary.avgReturnAmount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Avg Return</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold">{currencySymbol}{summary.maxReturnAmount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Max Return</div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="p-4">
            <div className="text-sm font-bold">{summary.mostCommonReason}</div>
            <div className="text-xs text-muted-foreground mt-1">Most Common Reason</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Cheque Return Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Party / Counterparty</th>
                  <th className="text-left p-2">Bank Branch</th>
                  <th className="text-left p-2">Cheque Number</th>
                  <th className="text-left p-2">Reason for Return</th>
                  <th className="text-left p-2">Returned by</th>
                  <th className="text-right p-2">Penalty</th>
                </tr>
              </thead>
              <tbody>
                {returnedCheques.map((cheque, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2">{cheque.date}</td>
                    <td className="text-right p-2 font-semibold text-red-600">{currencySymbol}{cheque.amount.toLocaleString()}</td>
                    <td className="p-2">{cheque.party}</td>
                    <td className="p-2">{cheque.bank}</td>
                    <td className="p-2 font-mono text-xs">{cheque.chequeNum}</td>
                    <td className="p-2">
                      <Badge variant="destructive" className="text-xs">{cheque.reason}</Badge>
                    </td>
                    <td className="p-2">{cheque.returnedBy}</td>
                    <td className="text-right p-2">{currencySymbol}{cheque.penalty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Return Reasons Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {reasonsBreakdown.map((item, idx) => (
              <div key={idx} className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{item.count}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.reason}</div>
                <div className="text-sm font-semibold mt-2">{item.percentage}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChequeReturnTab;
