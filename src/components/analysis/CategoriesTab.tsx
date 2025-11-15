import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";

interface CategoriesTabProps {
  projectId: string;
}

const CategoriesTab = ({ projectId }: CategoriesTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const operatingExpenses = [
    { name: "Office Rent / Equipment Lease", credit: 0, debit: 85000, txnCount: 12, percentage: 32 },
    { name: "Employees salaries", credit: 0, debit: 120000, txnCount: 24, percentage: 45 },
    { name: "Utilities", credit: 0, debit: 15000, txnCount: 12, percentage: 5.6 },
    { name: "Transportation", credit: 0, debit: 8000, txnCount: 15, percentage: 3 },
    { name: "Sales & Marketing Spend", credit: 0, debit: 25000, txnCount: 10, percentage: 9.4 },
    { name: "Software & SaaS Tools", credit: 0, debit: 12000, txnCount: 8, percentage: 4.5 },
    { name: "Insurance", credit: 0, debit: 5000, txnCount: 4, percentage: 1.9 },
  ];

  const transactionTypes = [
    { type: "Cash & ATM", subTypes: ["Cash Deposit", "Cash Withdrawal", "ATM Withdrawal"] },
    { type: "Charges & Fees", subTypes: ["Bank Charges", "Penal Charges"] },
    { type: "I/W Funds Transfer", subTypes: ["Cheque", "NEFT", "Third Party Transfer", "UPI"] },
    { type: "Taxes", subTypes: ["GST Payments", "TDS Payments", "Income Tax", "Tax Penalties / Fines"] },
    { type: "Loan", subTypes: ["EMI", "Interest", "Internal Transfer"] },
  ];

  const inflowCategories = [
    { name: "Sales/Services Income", amount: 250000, percentage: 65, txnCount: 45 },
    { name: "Investment from Investors", amount: 80000, percentage: 21, txnCount: 2 },
    { name: "Government Subsidy", amount: 30000, percentage: 8, txnCount: 1 },
    { name: "Asset Sale Proceeds", amount: 15000, percentage: 4, txnCount: 3 },
    { name: "Internal Transfer", amount: 8000, percentage: 2, txnCount: 5 },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Transaction Categories</h2>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Operating Expenses</TabsTrigger>
          <TabsTrigger value="types">Transaction Types</TabsTrigger>
          <TabsTrigger value="inflow">Inflow Categories</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Operating Expenses Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Category</th>
                      <th className="text-right p-2">Total Debit ({currencySymbol})</th>
                      <th className="text-right p-2">Txn Count</th>
                      <th className="text-right p-2">Percentage</th>
                      <th className="text-right p-2">Avg Per Txn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatingExpenses.map((expense, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{expense.name}</td>
                        <td className="text-right p-2">{expense.debit.toLocaleString()}</td>
                        <td className="text-right p-2">{expense.txnCount}</td>
                        <td className="text-right p-2">{expense.percentage}%</td>
                        <td className="text-right p-2">{currencySymbol}{(expense.debit / expense.txnCount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> A transaction can be of multiple categories. One is transaction type categorization, 
                  and one is purpose type categorization.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Type Categorization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {transactionTypes.map((type, idx) => (
                  <div key={idx} className="border-b pb-4 last:border-0">
                    <h3 className="font-semibold mb-3">{type.type}</h3>
                    <div className="flex flex-wrap gap-2">
                      {type.subTypes.map((subType, sidx) => (
                        <Badge key={sidx} variant="outline" className="text-xs">
                          {subType}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inflow">
          <Card>
            <CardHeader>
              <CardTitle>Inflow Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Category</th>
                      <th className="text-right p-2">Total Credit (₹)</th>
                      <th className="text-right p-2">Percentage</th>
                      <th className="text-right p-2">Txn Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inflowCategories.map((category, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{category.name}</td>
                        <td className="text-right p-2 text-green-600">{category.amount.toLocaleString()}</td>
                        <td className="text-right p-2">{category.percentage}%</td>
                        <td className="text-right p-2">{category.txnCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments">
          <Card>
            <CardHeader>
              <CardTitle>Investment Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Fixed Deposit Investments", "Mutual Funds / Stock Market", "Real Estate or Asset Purchases", 
                  "Acquisitions / Equity Investments", "Interest Income from Investments"].map((investment, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="font-medium">{investment}</span>
                    <span className="text-muted-foreground">No data</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CategoriesTab;
