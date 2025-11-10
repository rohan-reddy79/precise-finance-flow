import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RecurringTabProps {
  projectId: string;
}

const RecurringTab = ({ projectId }: RecurringTabProps) => {
  const creditRecurring = [
    { startDate: "2020-01-05", endDate: "2020-12-05", particulars: "Salary Credit", counterparty: "ABC Corp", amount: 50000, interval: "Monthly", misses: 0 },
    { startDate: "2020-01-15", endDate: "2020-12-15", particulars: "Rent Income", counterparty: "Tenant", amount: 15000, interval: "Monthly", misses: 1 },
    { startDate: "2020-02-01", endDate: "2020-11-01", particulars: "Consulting Fee", counterparty: "Client X", amount: 25000, interval: "Monthly", misses: 2 },
  ];

  const debitRecurring = [
    { startDate: "2020-01-10", endDate: "2020-12-10", particulars: "Office Rent", counterparty: "Landlord", amount: 20000, interval: "Monthly", misses: 0 },
    { startDate: "2020-01-15", endDate: "2020-12-15", particulars: "Loan EMI", counterparty: "HDFC Bank", amount: 12000, interval: "Monthly", misses: 1 },
    { startDate: "2020-01-20", endDate: "2020-12-20", particulars: "Insurance Premium", counterparty: "Insurance Co", amount: 5000, interval: "Monthly", misses: 0 },
    { startDate: "2020-01-25", endDate: "2020-12-25", particulars: "Software Subscription", counterparty: "SaaS Provider", amount: 2000, interval: "Monthly", misses: 3 },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Recurring Credit & Debit Analysis</h2>

      <Card>
        <CardHeader>
          <CardTitle>Credit - Recurring Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Start Date</th>
                  <th className="text-left p-2">End Date</th>
                  <th className="text-left p-2">Particulars</th>
                  <th className="text-left p-2">Counterparty</th>
                  <th className="text-right p-2">Amount (₹)</th>
                  <th className="text-center p-2">Interval</th>
                  <th className="text-center p-2">Misses</th>
                </tr>
              </thead>
              <tbody>
                {creditRecurring.map((txn, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2">{txn.startDate}</td>
                    <td className="p-2">{txn.endDate}</td>
                    <td className="p-2 font-medium">{txn.particulars}</td>
                    <td className="p-2">{txn.counterparty}</td>
                    <td className="text-right p-2 text-green-600 font-semibold">
                      {txn.amount.toLocaleString()}
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline">{txn.interval}</Badge>
                    </td>
                    <td className="text-center p-2">
                      {txn.misses > 0 ? (
                        <Badge variant="destructive">{txn.misses}</Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debit - Recurring Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Start Date</th>
                  <th className="text-left p-2">End Date</th>
                  <th className="text-left p-2">Particulars</th>
                  <th className="text-left p-2">Counterparty</th>
                  <th className="text-right p-2">Amount (₹)</th>
                  <th className="text-center p-2">Interval</th>
                  <th className="text-center p-2">Misses</th>
                </tr>
              </thead>
              <tbody>
                {debitRecurring.map((txn, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2">{txn.startDate}</td>
                    <td className="p-2">{txn.endDate}</td>
                    <td className="p-2 font-medium">{txn.particulars}</td>
                    <td className="p-2">{txn.counterparty}</td>
                    <td className="text-right p-2 text-red-600 font-semibold">
                      {txn.amount.toLocaleString()}
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline">{txn.interval}</Badge>
                    </td>
                    <td className="text-center p-2">
                      {txn.misses > 0 ? (
                        <Badge variant="destructive">{txn.misses}</Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Credit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Recurring Credits:</span>
                <span className="font-bold">{creditRecurring.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Monthly Amount:</span>
                <span className="font-bold text-green-600">
                  ₹{creditRecurring.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Misses:</span>
                <span className="font-bold text-orange-600">
                  {creditRecurring.reduce((sum, t) => sum + t.misses, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Recurring Debits:</span>
                <span className="font-bold">{debitRecurring.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Monthly Amount:</span>
                <span className="font-bold text-red-600">
                  ₹{debitRecurring.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Misses:</span>
                <span className="font-bold text-orange-600">
                  {debitRecurring.reduce((sum, t) => sum + t.misses, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecurringTab;
