import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AnalysisNavProps {
  activeTab: string;
  projectId: string;
}

const AnalysisNav = ({ activeTab, projectId }: AnalysisNavProps) => {
  const navigate = useNavigate();

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "summary", label: "Summary" },
    { id: "transactions", label: "All Transactions" },
    { id: "irregularities", label: "Irregularities" },
    { id: "aml", label: "AML Analysis" },
    { id: "bizcashflow", label: "Biz CashFlow" },
    { id: "monthlysummary", label: "Monthly Summary" },
    { id: "counterparty", label: "CounterParty" },
    { id: "counterpartymonthly", label: "CounterParty Monthly" },
    { id: "categories", label: "Categories" },
    { id: "chequereturn", label: "Cheque Return" },
    { id: "recurring", label: "Recurring Credit & Debit" },
    { id: "loananalysis", label: "Loan Analysis" },
    { id: "dailybalance", label: "Daily Balance" },
    { id: "duplicates", label: "Duplicate Transactions" },
    { id: "salaries", label: "Salaries Paid" },
    { id: "upianalysis", label: "UPI Txns Analysis" },
    { id: "odutilization", label: "OC or DD Utilization" },
  ];

  const handleTabClick = (tabId: string) => {
    navigate(`/analysis/${projectId}?tab=${tabId}`);
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex space-x-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "shrink-0",
              activeTab === tab.id && "bg-primary text-primary-foreground"
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default AnalysisNav;
