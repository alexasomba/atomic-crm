import type { Identifier } from "ra-core";
import type {
  CopilotContact,
  CopilotContactFilters,
  CompanyContactStats,
} from "./copilotContacts";
import type { CopilotAuditEvent } from "@/components/atomic-crm/types";

export type CopilotCrmMethods = {
  searchCopilotContacts(
    filters: CopilotContactFilters,
  ): Promise<CopilotContact[]>;
  getCopilotContact(id: Identifier): Promise<CopilotContact | null>;
  getCopilotContactsByCompany(company: string): Promise<{
    contacts: CopilotContact[];
    stats: CompanyContactStats;
  }>;
  getTopCopilotLeads(limit?: number): Promise<CopilotContact[]>;
  updateRenewalForecast(
    id: Identifier,
    data: {
      renewal_forecast_category?: string;
      renewal_probability?: number;
    },
  ): Promise<CopilotContact>;
  getContactContract(
    id: Identifier,
  ): Promise<{ contactId: number | null; filename: string | null; text: string }>;
  logCopilotAudit(
    event: Omit<CopilotAuditEvent, "id" | "createdAt">,
  ): Promise<void>;
  listCopilotAudit(filters?: {
    contactName?: string;
    companyName?: string;
  }): Promise<CopilotAuditEvent[]>;
};

const origin = () =>
  (
    import.meta.env.VITE_COPILOTKIT_API_URL ||
    import.meta.env.VITE_CLOUDFLARE_API_URL ||
    ""
  ).replace(/\/$/, "");

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${origin()}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: unknown;
  };
  if (!response.ok) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : `Request failed (${response.status})`,
    );
  }
  return body;
};

export const cloudflareCopilotMethods = (): CopilotCrmMethods => ({
  async searchCopilotContacts(filters) {
    const search = new URLSearchParams();
    if (filters.firstName) search.set("first_name", filters.firstName);
    if (filters.lastName) search.set("last_name", filters.lastName);
    if (filters.company) search.set("company", filters.company);
    if (filters.lifecycleStage)
      search.set("lifecycle_stage", filters.lifecycleStage);
    if (filters.leadScoreMin != null)
      search.set("lead_score_min", String(filters.leadScoreMin));
    if (filters.leadScoreMax != null)
      search.set("lead_score_max", String(filters.leadScoreMax));
    if (filters.status) search.set("status", filters.status);
    return request<CopilotContact[]>(`/api/contacts?${search}`);
  },
  async getCopilotContact(id) {
    try {
      return await request<CopilotContact>(`/api/contacts/${id}`);
    } catch {
      return null;
    }
  },
  getCopilotContactsByCompany(company) {
    return request(`/api/companies/${encodeURIComponent(company)}/contacts`);
  },
  getTopCopilotLeads(limit = 10) {
    return request(`/api/leads/top?limit=${limit}`);
  },
  updateRenewalForecast(id, data) {
    return request(`/api/contacts/${id}/forecast`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  getContactContract(id) {
    return request(`/api/contacts/${id}/contract`);
  },
  async logCopilotAudit(event) {
    await request("/api/audit", {
      method: "POST",
      body: JSON.stringify(event),
    });
  },
  async listCopilotAudit(filters = {}) {
    const search = new URLSearchParams();
    if (filters.contactName) search.set("contactName", filters.contactName);
    if (filters.companyName) search.set("companyName", filters.companyName);
    const query = search.toString();
    const rows = await request<
      Array<CopilotAuditEvent & { timestamp?: string; created_at?: string }>
    >(`/api/audit${query ? `?${query}` : ""}`);
    return rows.map((row) => ({
      id: row.id,
      actionType: row.actionType,
      toolName: row.toolName,
      contactName: row.contactName,
      companyName: row.companyName,
      summary: row.summary,
      createdAt: row.createdAt ?? row.timestamp ?? row.created_at ?? "",
    }));
  },
});
