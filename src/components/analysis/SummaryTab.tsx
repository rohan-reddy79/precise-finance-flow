import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface SummaryTabProps {
  projectId: string;
}

const SummaryTab = ({ projectId }: SummaryTabProps) => {
  const months = ["Jan 2020", "Feb 2020", "Mar 2020", "Apr 2020", "May 2020", "Jun 2020", 
                  "Jul 2020", "Aug 2020", "Sep 2020", "Oct 2020", "Nov 2020", "Dec 2020"];
  
  const metrics = [
    "Opening Balance", "Total Inflow Amount", "Total Outflow Amount", "Closing Balance",
    "Total Inflow Counts", "Total Outflow Counts", "Max Balance", "Min Balance",
    "Average Balance", "Business Credit Counts", "Total Business Credit Amount",
    "Business Debit Counts", "Total Business Debit Amount", "ECS Return Counts",
    "Loan Credit", "Loan Credit Count", "Loan EMI Outflow", "Loan EMI Outflow Count",
    "Fixed Obligations (EMIs + Other Recurring)", "FOIR Score", "ECS/NACH Issued Counts",
    "ECS/NACH Issued", "CASH Credit Counts", "Total CASH Credit Amount",
    "CASH Debit Counts", "Total CASH Debit Amount", "Cheque Deposits Count",
    "Total Cheque Deposits Amount", "Cheque Issues Count", "Total Cheque Issues Amount"
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Overall Summary</h2>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 sticky left-0 bg-card">Description</th>
                  {months.map((month, idx) => (
                    <th key={idx} className="text-right p-2 whitespace-nowrap">{month}</th>
                  ))}
                  <th className="text-right p-2 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 sticky left-0 bg-card font-medium">{metric}</td>
                    {months.map((_, midx) => (
                      <td key={midx} className="text-right p-2">-</td>
                    ))}
                    <td className="text-right p-2 font-semibold">-</td>
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

export default SummaryTab;
