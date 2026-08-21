import { useDataProvider } from "ra-core";
import { useEffect, useState } from "react";
import type { CrmDataProvider } from "../providers/types";
import type {
  CompanyContactStats,
  CopilotContact,
} from "@/lib/copilotContacts";

export interface CompanyEnrichmentData {
  contacts: CopilotContact[];
  stats: CompanyContactStats;
}

export function useCompanyEnrichment(companyName?: string): {
  data: CompanyEnrichmentData | null;
  isLoading: boolean;
} {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const [data, setData] = useState<CompanyEnrichmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!companyName) return;
    let cancelled = false;
    setIsLoading(true);
    dataProvider
      .getCopilotContactsByCompany(companyName)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => console.warn("Company enrichment failed:", error))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyName, dataProvider]);

  return { data, isLoading };
}
