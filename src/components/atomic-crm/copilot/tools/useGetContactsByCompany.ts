import { useAuditedFrontendTool as useFrontendTool } from "./useAuditedFrontendTool";
import { z } from "zod";

const API_BASE =
  import.meta.env.VITE_COPILOTKIT_API_URL || "http://localhost:4000";

const getContactsByCompanyParameters = z.object({
  companyName: z.string().describe("The company name to look up contacts for"),
});

export function useGetContactsByCompany() {
  useFrontendTool({
    name: "getContactsByCompany",
    description: "Get all contacts associated with a specific company.",
    parameters: getContactsByCompanyParameters,
    handler: async (params) => {
      const { companyName } = getContactsByCompanyParameters.parse(params);
      const res = await fetch(
        `${API_BASE}/api/companies/${encodeURIComponent(companyName)}/contacts`,
      );
      if (!res.ok) {
        throw new Error(
          `getContactsByCompany HTTP ${res.status} ${res.statusText}`,
        );
      }
      return res.json();
    },
  });
}
