import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BizCashFlowTabProps {
  projectId: string;
}

const BizCashFlowTab = ({ projectId }: BizCashFlowTabProps) => {
  const months = ["Jan 2020", "Feb 2020", "Mar 2020", "Apr 2020", "May 2020", "Jun 2020", 
                  "Jul 2020", "Aug 2020", "Sep 2020", "Oct 2020", "Nov 2020", "Dec 2020"];
  
  const data = months.map(month => ({
    month,
    totalInflow: 0,
    bizInflow: 0,
    bizInflowPct: 0,
    bizInflowTxns: 0,
    totalOutflow: 0,
    bizOutflow: 0,
    bizOutflowPct: 0,
    bizOutflowTxns: 0,
    netBizCashFlow: 0,
  }));

  const summaryRows = [
    { label: "Total" },
    { label: "Monthly Avg" },
    { label: "Last 12 Months Avg" },
    { label: "Monthly Median" },
  ];

  const quarterlyRows = [
    { label: "Last 3 Months" },
    { label: "Last 6 Months" },
    { label: "Last 9 Months" },
    { label: "Last 12 Months" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Business Cash Flow Analysis</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Monthly Business Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Month</th>
                  <th className="text-right p-2">Total Inflow (₹)</th>
                  <th className="text-right p-2">Biz Inflow (₹)</th>
                  <th className="text-right p-2">% Biz Inflow</th>
                  <th className="text-right p-2">Biz Inflow Txns</th>
                  <th className="text-right p-2">Total Outflow (₹)</th>
                  <th className="text-right p-2">Biz Outflow (₹)</th>
                  <th className="text-right p-2">% Biz Outflow</th>
                  <th className="text-right p-2">Biz Outflow Txns</th>
                  <th className="text-right p-2">Net Biz Cash Flow (₹)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{row.month}</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2 font-semibold">-</td>
                  </tr>
                ))}
                {summaryRows.map((row, idx) => (
                  <tr key={`sum-${idx}`} className="border-b bg-muted/30 font-semibold">
                    <td className="p-2">{row.label}</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cumulative Quarterly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Period</th>
                  <th className="text-right p-2">Total Inflow (₹)</th>
                  <th className="text-right p-2">Biz Inflow (₹)</th>
                  <th className="text-right p-2">Total Outflow (₹)</th>
                  <th className="text-right p-2">Biz Outflow (₹)</th>
                  <th className="text-right p-2">Net Biz Cash Flow (₹)</th>
                </tr>
              </thead>
              <tbody>
                {quarterlyRows.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{row.label}</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
                    <td className="text-right p-2">-</td>
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

export default BizCashFlowTab;
