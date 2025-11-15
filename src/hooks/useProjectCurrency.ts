import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useProjectCurrency(projectId: string) {
  const [currency, setCurrency] = useState<string>("USD");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function fetchCurrency() {
      try {
        const { data: statements } = await supabase
          .from("bank_statements")
          .select("currency, processed_at, created_at")
          .eq("project_id", projectId)
          .order("processed_at", { ascending: false, nullsFirst: false })
          .limit(1);

        if (mounted) {
          setCurrency(statements?.[0]?.currency || "USD");
        }
      } catch {
        if (mounted) setCurrency("USD");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchCurrency();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const currencySymbol = currency === "INR" ? "₹" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";

  return { currency, currencySymbol, loading };
}
