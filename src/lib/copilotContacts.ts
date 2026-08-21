export type CopilotContact = {
  id: number;
  first_name: string;
  last_name: string;
  gender: string | null;
  title: string | null;
  company_name: string;
  company_id: number | null;
  status: string | null;
  lifecycle_stage: string | null;
  lead_score: number;
  last_activity_date: string | null;
  last_activity_type: string | null;
  renewal_amount: number | null;
  renewal_date: string | null;
  renewal_forecast_category: string | null;
  renewal_probability: number | null;
  contract_file: string | null;
  economic_buyer_identified: boolean;
  budget_confirmed: boolean;
  legal_review_status: string | null;
  security_review_status: string | null;
  champion_confidence: string | null;
  competitor: string | null;
  next_best_action: string | null;
  notes_summary: string | null;
};

export type CopilotContactFilters = {
  firstName?: string;
  lastName?: string;
  company?: string;
  lifecycleStage?: string;
  leadScoreMin?: number;
  leadScoreMax?: number;
  status?: string;
};

export type CompanyContactStats = {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  inContract: number;
};

const matchesText = (value: string | null | undefined, query: string) =>
  (value ?? "").toLowerCase() === query.trim().toLowerCase();

const includesText = (value: string | null | undefined, query: string) =>
  (value ?? "").toLowerCase().includes(query.trim().toLowerCase());

export const filterCopilotContacts = (
  contacts: CopilotContact[],
  filters: CopilotContactFilters,
): CopilotContact[] =>
  contacts.filter((contact) => {
    if (
      filters.firstName &&
      !matchesText(contact.first_name, filters.firstName)
    ) {
      return false;
    }
    if (filters.lastName && !matchesText(contact.last_name, filters.lastName)) {
      return false;
    }
    if (filters.company && !includesText(contact.company_name, filters.company)) {
      return false;
    }
    if (
      filters.lifecycleStage &&
      contact.lifecycle_stage !== filters.lifecycleStage
    ) {
      return false;
    }
    if (
      filters.leadScoreMin != null &&
      contact.lead_score < filters.leadScoreMin
    ) {
      return false;
    }
    if (
      filters.leadScoreMax != null &&
      contact.lead_score > filters.leadScoreMax
    ) {
      return false;
    }
    if (filters.status && contact.status !== filters.status) {
      return false;
    }
    return true;
  });

export const rankTopLeads = (
  contacts: CopilotContact[],
  limit = 10,
): CopilotContact[] =>
  [...contacts]
    .sort((left, right) => right.lead_score - left.lead_score)
    .slice(0, Math.max(limit, 0));

export const contactsByCompany = (
  contacts: CopilotContact[],
  companyName: string,
): { contacts: CopilotContact[]; stats: CompanyContactStats } => {
  const companyContacts = contacts.filter((contact) =>
    matchesText(contact.company_name, companyName),
  );
  return {
    contacts: companyContacts,
    stats: {
      total: companyContacts.length,
      hot: companyContacts.filter((contact) => contact.status === "hot").length,
      warm: companyContacts.filter((contact) => contact.status === "warm")
        .length,
      cold: companyContacts.filter((contact) => contact.status === "cold")
        .length,
      inContract: companyContacts.filter(
        (contact) => contact.status === "in-contract",
      ).length,
    },
  };
};

export const fromContactRecords = (
  contact: {
    id: number;
    first_name: string;
    last_name: string;
    gender?: string | null;
    title?: string | null;
    company_id?: number | null;
    company_name?: string | null;
    status?: string | null;
  },
  insights?: {
    lifecycle_stage?: string | null;
    lead_score?: number | null;
    last_activity_date?: string | null;
    last_activity_type?: string | null;
    renewal_amount?: number | null;
    renewal_date?: string | null;
    renewal_forecast_category?: string | null;
    renewal_probability?: number | null;
    contract_attachment_id?: string | null;
    economic_buyer_identified?: boolean;
    budget_confirmed?: boolean;
    legal_review_status?: string | null;
    security_review_status?: string | null;
    champion_confidence?: string | null;
    competitor?: string | null;
    next_best_action?: string | null;
    notes_summary?: string | null;
  } | null,
): CopilotContact => ({
  id: Number(contact.id),
  first_name: contact.first_name,
  last_name: contact.last_name,
  gender: contact.gender ?? null,
  title: contact.title ?? null,
  company_name: contact.company_name ?? "",
  company_id: contact.company_id ?? null,
  status: contact.status ?? null,
  lifecycle_stage: insights?.lifecycle_stage ?? null,
  lead_score: insights?.lead_score ?? 0,
  last_activity_date: insights?.last_activity_date ?? null,
  last_activity_type: insights?.last_activity_type ?? null,
  renewal_amount: insights?.renewal_amount ?? null,
  renewal_date: insights?.renewal_date ?? null,
  renewal_forecast_category: insights?.renewal_forecast_category ?? null,
  renewal_probability: insights?.renewal_probability ?? null,
  contract_file: insights?.contract_attachment_id ?? null,
  economic_buyer_identified: insights?.economic_buyer_identified ?? false,
  budget_confirmed: insights?.budget_confirmed ?? false,
  legal_review_status: insights?.legal_review_status ?? null,
  security_review_status: insights?.security_review_status ?? null,
  champion_confidence: insights?.champion_confidence ?? null,
  competitor: insights?.competitor ?? null,
  next_best_action: insights?.next_best_action ?? null,
  notes_summary: insights?.notes_summary ?? null,
});

export const toLeadPriority = (contact: CopilotContact) => ({
  contactId: contact.id,
  name: `${contact.first_name} ${contact.last_name}`.trim(),
  score: contact.lead_score,
  lifecycleStage: contact.lifecycle_stage,
  lastActivity:
    contact.last_activity_type && contact.last_activity_date
      ? `${contact.last_activity_type} on ${contact.last_activity_date}`
      : (contact.last_activity_type ?? contact.last_activity_date ?? ""),
  company: contact.company_name,
  status: contact.status,
  title: contact.title,
});
