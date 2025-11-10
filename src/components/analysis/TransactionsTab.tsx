import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TransactionsTabProps {
  projectId: string;
}

const TransactionsTab = ({ projectId }: TransactionsTabProps) => {
  const [filter, setFilter] = useState("");

  const transactions = [
    { id: 1, date: "2024-01-15", description: "Salary Credit", counterParty: "ABC Corp", credit: 50000, debit: 0, balance: 75000, category: "Income", tags: ["Salary"], refNum: "REF123" },
    { id: 2, date: "2024-01-16", description: "Rent Payment", counterParty: "Landlord", credit: 0, debit: 20000, balance: 55000, category: "Expense", tags: ["Rent"], refNum: "CHQ456" },
    { id: 3, date: "2024-01-17", description: "Utility Bill", counterParty: "Power Co", credit: 0, debit: 2000, balance: 53000, category: "Utilities", tags: ["Bills"], refNum: "NEFT789" },
  ];

  const preDefinedFilters = ["Cash transactions", "Cheque", "High value debit txns", "High value credit txns"];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold">All Transactions</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Input placeholder="Search transactions..." className="max-w-sm" />
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">S No</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">CounterParty</th>
                    <th className="text-right p-2">Credit (₹)</th>
                    <th className="text-right p-2">Debit (₹)</th>
                    <th className="text-right p-2">Balance (₹)</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Ref Num</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{txn.id}</td>
                      <td className="p-2">{txn.date}</td>
                      <td className="p-2">{txn.description}</td>
                      <td className="p-2">{txn.counterParty}</td>
                      <td className="text-right p-2 text-green-600">{txn.credit > 0 ? txn.credit.toLocaleString() : "-"}</td>
                      <td className="text-right p-2 text-red-600">{txn.debit > 0 ? txn.debit.toLocaleString() : "-"}</td>
                      <td className="text-right p-2 font-semibold">{txn.balance.toLocaleString()}</td>
                      <td className="p-2">
                        <Badge variant="outline">{txn.category}</Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{txn.refNum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pre-Defined Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {preDefinedFilters.map((filter, idx) => (
                <Button key={idx} variant="outline" size="sm" className="w-full justify-start">
                  {filter}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>Amount (Debit/Credit)</div>
              <div>Balance</div>
              <div>Category</div>
              <div>Cheque/Ref nbr</div>
              <div>Counterparty</div>
              <div>Txn date</div>
              <div>Txn mode</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TransactionsTab;
