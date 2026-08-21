import { useDataProvider } from "ra-core";
import { useEffect, useState } from "react";
import type { ContactInsights } from "../types";
import type { CrmDataProvider } from "../providers/types";
import type { CopilotContact } from "@/lib/copilotContacts";

const toInsights = (
  contactId: number,
  contact: CopilotContact,
): ContactInsights => ({
  id: contactId,
  contact_id: contactId,
  lifecycle_stage: contact.lifecycle_stage,
  lead_score: contact.lead_score,
  last_activity_date: contact.last_activity_date,
  last_activity_type: contact.last_activity_type,
  renewal_amount: contact.renewal_amount,
  renewal_date: contact.renewal_date,
  renewal_forecast_category: contact.renewal_forecast_category,
  renewal_probability: contact.renewal_probability,
  contract_attachment_id: contact.contract_file,
  economic_buyer_identified: contact.economic_buyer_identified,
  budget_confirmed: contact.budget_confirmed,
  legal_review_status: contact.legal_review_status,
  security_review_status: contact.security_review_status,
  champion_confidence: contact.champion_confidence,
  competitor: contact.competitor,
  next_best_action: contact.next_best_action,
  notes_summary: contact.notes_summary,
  updated_at: contact.last_activity_date ?? new Date().toISOString(),
});

export function useContactEnrichment(contactId?: number | string): {
  data: ContactInsights | null;
  isLoading: boolean;
} {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const [data, setData] = useState<ContactInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (contactId == null) return;
    let cancelled = false;
    setIsLoading(true);
    dataProvider
      .getCopilotContact(contactId)
      .then((contact) => {
        if (!cancelled) {
          setData(contact ? toInsights(Number(contactId), contact) : null);
        }
      })
      .catch((error) => console.warn("Contact enrichment failed:", error))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contactId, dataProvider]);

  return { data, isLoading };
}
