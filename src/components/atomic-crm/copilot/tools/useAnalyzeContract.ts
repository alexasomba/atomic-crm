import { useAuditedFrontendTool as useFrontendTool } from "./useAuditedFrontendTool";
import { useDataProvider } from "ra-core";
import { z } from "zod";
import type { CrmDataProvider } from "../../providers/types";

export function useAnalyzeContract() {
  const dataProvider = useDataProvider<CrmDataProvider>();

  useFrontendTool({
    name: "analyzeContract",
    description:
      "Load the stored contract text for a contact. ALWAYS use a real contactId from searchContacts or getContactsByCompany. Never invent clauses.",
    parameters: z.object({
      contactId: z.number().describe("CRM contact id that owns the contract"),
      companyName: z
        .string()
        .optional()
        .describe("Company name for audit context"),
    }),
    handler: async (params) =>
      dataProvider.getContactContract(Number(params.contactId)),
  });
}
