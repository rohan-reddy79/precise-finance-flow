import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MonthlySummaryTabProps {
  projectId: string;
}

const MonthlySummaryTab = ({ projectId }: MonthlySummaryTabProps) => {
  const months = ["Jan 2020", "Feb 2020", "Mar 2020", "Apr 2020"];

  const categories = {
    balance: ["Opening Bal", "Closing Bal", "Min EOD Bal", "Max EOD Bal", "Avg Bal"],
    credit: ["Loan amount credited", "Cash", "NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Third Party Transfer", "Cheque Return"],
    debit: ["Salary", "Sales & Marketing", "Insurance", "Tax Paid", "Loan", "EMI", "Interest", "Charges & Fees", 
            "Penal Charges", "Bank Charges", "Cash & ATM withdrawals", "ATM", "NEFT", "UPI", "Cheque", "IMPS", "Third Party Transfer"]
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Monthly Summary</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Detailed Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 sticky left-0 bg-card"></th>
                  {months.map((month, idx) => (
                    <th key={idx} colSpan={2} className="text-center p-2 border-l">{month}</th>
                  ))}
                </tr>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2 sticky left-0 bg-card"></th>
                  {months.map((_, idx) => (
                    <>
                      <th key={`amt-${idx}`} className="text-right p-2">Amount</th>
                      <th key={`cnt-${idx}`} className="text-right p-2">Txn Count</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-muted/30">
                  <td colSpan={9} className="p-2 font-bold">Balance</td>
                </tr>
                {categories.balance.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 pl-4">{item}</td>
                    {months.map((_, midx) => (
                      <>
                        <td key={`amt-${midx}`} className="text-right p-2">-</td>
                        <td key={`cnt-${midx}`} className="text-right p-2">-</td>
                      </>
                    ))}
                  </tr>
                ))}
                
                <tr className="bg-muted/30">
                  <td colSpan={9} className="p-2 font-bold">Credit</td>
                </tr>
                {categories.credit.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 pl-4">{item}</td>
                    {months.map((_, midx) => (
                      <>
                        <td key={`amt-${midx}`} className="text-right p-2">-</td>
                        <td key={`cnt-${midx}`} className="text-right p-2">-</td>
                      </>
                    ))}
                  </tr>
                ))}

                <tr className="bg-muted/30">
                  <td colSpan={9} className="p-2 font-bold">Debit</td>
                </tr>
                {categories.debit.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2 pl-4">{item}</td>
                    {months.map((_, midx) => (
                      <>
                        <td key={`amt-${midx}`} className="text-right p-2">-</td>
                        <td key={`cnt-${midx}`} className="text-right p-2">-</td>
                      </>
                    ))}
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

export default MonthlySummaryTab;
