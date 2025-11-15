import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";

interface CounterPartyTabProps {
  projectId: string;
}

const CounterPartyTab = ({ projectId }: CounterPartyTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [searchTerm, setSearchTerm] = useState("");

  const creditCounterparties = [
    { name: "ABC Corporation", amount: 125000, percentage: 30, txnCount: 15 },
    { name: "XYZ Limited", amount: 95000, percentage: 22.8, txnCount: 10 },
    { name: "Client Services Inc", amount: 75000, percentage: 18, txnCount: 8 },
    { name: "Tech Solutions", amount: 60000, percentage: 14.4, txnCount: 6 },
    { name: "Others", amount: 62000, percentage: 14.8, txnCount: 12 },
  ];

  const debitCounterparties = [
    { name: "Office Rent", amount: 85000, percentage: 32, txnCount: 12 },
    { name: "Supplier A", amount: 65000, percentage: 24.5, txnCount: 18 },
    { name: "Utilities Co", amount: 45000, percentage: 17, txnCount: 12 },
    { name: "Marketing Agency", amount: 35000, percentage: 13.2, txnCount: 8 },
    { name: "Others", amount: 35250, percentage: 13.3, txnCount: 25 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold">CounterParty Analysis</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search counterparty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Credit Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Counterparty</th>
                    <th className="text-right p-2">Amount ({currencySymbol})</th>
                    <th className="text-right p-2">Amount %</th>
                    <th className="text-right p-2">Txns Count</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {creditCounterparties.map((cp, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{cp.name}</td>
                      <td className="text-right p-2">{cp.amount.toLocaleString()}</td>
                      <td className="text-right p-2">{cp.percentage}%</td>
                      <td className="text-right p-2">{cp.txnCount}</td>
                      <td className="text-center p-2">
                        <Button variant="outline" size="sm">
                          View Txns
                        </Button>
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
            <CardTitle>Debit Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Counterparty</th>
                    <th className="text-right p-2">Amount ({currencySymbol})</th>
                    <th className="text-right p-2">Amount %</th>
                    <th className="text-right p-2">Txns Count</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {debitCounterparties.map((cp, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{cp.name}</td>
                      <td className="text-right p-2">{cp.amount.toLocaleString()}</td>
                      <td className="text-right p-2">{cp.percentage}%</td>
                      <td className="text-right p-2">{cp.txnCount}</td>
                      <td className="text-center p-2">
                        <Button variant="outline" size="sm">
                          View Txns
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CounterPartyTab;
