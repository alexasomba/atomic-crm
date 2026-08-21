import { useAuditedFrontendTool as useFrontendTool } from "./useAuditedFrontendTool";
import { useDataProvider } from "ra-core";
import { z } from "zod";
import type { CrmDataProvider } from "../../providers/types";

export function useSearchContacts() {
  const dataProvider = useDataProvider<CrmDataProvider>();

  useFrontendTool({
    name: "searchContacts",
    description:
      "Find contacts by name and/or filter by company, lifecycle stage, lead score, or status. Use this FIRST whenever you need a contact's id (e.g. before createTask). When the user mentions a person by name, pass firstName and lastName.",
    parameters: z.object({
      firstName: z
        .string()
        .optional()
        .describe("Contact first name (use together with lastName)"),
      lastName: z
        .string()
        .optional()
        .describe("Contact last name (use together with firstName)"),
      company: z.string().optional().describe("Filter by company name"),
      lifecycleStage: z
        .string()
        .optional()
        .describe("Filter by lifecycle stage"),
      leadScoreMin: z.number().optional().describe("Minimum lead score"),
      leadScoreMax: z.number().optional().describe("Maximum lead score"),
      status: z
        .string()
        .optional()
        .describe("Filter by status (hot, warm, cold, in-contract)"),
    }),
    handler: async (params) =>
      dataProvider.searchCopilotContacts({
        firstName:
          typeof params.firstName === "string" ? params.firstName : undefined,
        lastName:
          typeof params.lastName === "string" ? params.lastName : undefined,
        company: typeof params.company === "string" ? params.company : undefined,
        lifecycleStage:
          typeof params.lifecycleStage === "string"
            ? params.lifecycleStage
            : undefined,
        leadScoreMin:
          typeof params.leadScoreMin === "number"
            ? params.leadScoreMin
            : undefined,
        leadScoreMax:
          typeof params.leadScoreMax === "number"
            ? params.leadScoreMax
            : undefined,
        status: typeof params.status === "string" ? params.status : undefined,
      }),
  });
}
