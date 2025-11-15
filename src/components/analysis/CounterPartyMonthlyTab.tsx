import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";

interface CounterPartyMonthlyTabProps {
  projectId: string;
}

const CounterPartyMonthlyTab = ({ projectId }: CounterPartyMonthlyTabProps) => {
  const { currencySymbol } = useProjectCurrency(projectId);
  const [filter, setFilter] = useState("both");
  const [searchTerm, setSearchTerm] = useState("");

  const months = ["January", "February", "March", "April", "May", "June"];
  
  const counterparties = [
    { name: "ABC Corporation", totalCredit: 125000, totalCreditTxns: 15, totalDebit: 0, totalDebitTxns: 0 },
    { name: "Office Rent", totalCredit: 0, totalCreditTxns: 0, totalDebit: 85000, totalDebitTxns: 12 },
    { name: "XYZ Limited", totalCredit: 95000, totalCreditTxns: 10, totalDebit: 0, totalDebitTxns: 0 },
    { name: "Supplier A", totalCredit: 0, totalCreditTxns: 0, totalDebit: 65000, totalDebitTxns: 18 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold">CounterParty Monthly Analysis</h2>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="credit">Credit Only</SelectItem>
              <SelectItem value="debit">Debit Only</SelectItem>
            </SelectContent>
          </Select>
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

      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown by CounterParty</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th rowSpan={2} className="text-left p-2 sticky left-0 bg-card">Counter Party</th>
                  <th colSpan={4} className="text-center p-2 border-l">Total (Start - End)</th>
                  {months.slice(0, 2).map((month, idx) => (
                    <th key={idx} colSpan={4} className="text-center p-2 border-l">{month}</th>
                  ))}
                  <th className="text-center p-2 border-l">...</th>
                </tr>
                <tr className="border-b text-muted-foreground">
                  <th className="text-right p-2">Credit ({currencySymbol})</th>
                  <th className="text-right p-2">Credit Txns</th>
                  <th className="text-right p-2">Debit ({currencySymbol})</th>
                  <th className="text-right p-2">Debit Txns</th>
                  {months.slice(0, 2).map((_, idx) => (
                    <>
                      <th key={`c${idx}`} className="text-right p-2">Credit ({currencySymbol})</th>
                      <th key={`ct${idx}`} className="text-right p-2">Txns</th>
                      <th key={`d${idx}`} className="text-right p-2">Debit ({currencySymbol})</th>
                      <th key={`dt${idx}`} className="text-right p-2">Txns</th>
                    </>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {counterparties.map((cp, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium sticky left-0 bg-card">{cp.name}</td>
                    <td className="text-right p-2">{cp.totalCredit.toLocaleString()}</td>
                    <td className="text-right p-2">{cp.totalCreditTxns}</td>
                    <td className="text-right p-2">{cp.totalDebit.toLocaleString()}</td>
                    <td className="text-right p-2">{cp.totalDebitTxns}</td>
                    {months.slice(0, 2).map((_, midx) => (
                      <>
                        <td key={`c${midx}`} className="text-right p-2">-</td>
                        <td key={`ct${midx}`} className="text-right p-2">-</td>
                        <td key={`d${midx}`} className="text-right p-2">-</td>
                        <td key={`dt${midx}`} className="text-right p-2">-</td>
                      </>
                    ))}
                    <td className="text-center p-2">...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CounterPartyMonthlyTab;
