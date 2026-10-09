import { useAuditedFrontendTool as useFrontendTool } from "./useAuditedFrontendTool";
import { z } from "zod";

const API_BASE =
  import.meta.env.VITE_COPILOTKIT_API_URL || "http://localhost:4000";

const searchContactsParameters = z.object({
  firstName: z
    .string()
    .optional()
    .describe("Contact first name (use together with lastName)"),
  lastName: z
    .string()
    .optional()
    .describe("Contact last name (use together with firstName)"),
  company: z.string().optional().describe("Filter by company name"),
  lifecycleStage: z.string().optional().describe("Filter by lifecycle stage"),
  leadScoreMin: z.number().optional().describe("Minimum lead score"),
  leadScoreMax: z.number().optional().describe("Maximum lead score"),
  status: z
    .string()
    .optional()
    .describe("Filter by status (hot, warm, cold, in-contract)"),
});

export function useSearchContacts() {
  useFrontendTool({
    name: "searchContacts",
    description:
      "Find contacts by name and/or filter by company, lifecycle stage, lead score, or status. Use this FIRST whenever you need a contact's id (e.g. before createTask). When the user mentions a person by name, pass firstName and lastName.",
    parameters: searchContactsParameters,
    handler: async (params) => {
      const filters = searchContactsParameters.parse(params);
      const searchParams = new URLSearchParams();
      if (filters.firstName) searchParams.set("first_name", filters.firstName);
      if (filters.lastName) searchParams.set("last_name", filters.lastName);
      if (filters.company) searchParams.set("company", filters.company);
      if (filters.lifecycleStage)
        searchParams.set("lifecycle_stage", filters.lifecycleStage);
      if (filters.leadScoreMin != null)
        searchParams.set("lead_score_min", String(filters.leadScoreMin));
      if (filters.leadScoreMax != null)
        searchParams.set("lead_score_max", String(filters.leadScoreMax));
      if (filters.status) searchParams.set("status", filters.status);
      const res = await fetch(`${API_BASE}/api/contacts?${searchParams}`);
      if (!res.ok) {
        throw new Error(`searchContacts HTTP ${res.status} ${res.statusText}`);
      }
      return res.json();
    },
  });
}
