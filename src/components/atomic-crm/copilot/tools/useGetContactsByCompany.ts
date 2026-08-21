import { useAuditedFrontendTool as useFrontendTool } from "./useAuditedFrontendTool";
import { useDataProvider } from "ra-core";
import { z } from "zod";
import type { CrmDataProvider } from "../../providers/types";

export function useGetContactsByCompany() {
  const dataProvider = useDataProvider<CrmDataProvider>();

  useFrontendTool({
    name: "getContactsByCompany",
    description: "Get all contacts associated with a specific company.",
    parameters: z.object({
      companyName: z
        .string()
        .describe("The company name to look up contacts for"),
    }),
    handler: async (params) =>
      dataProvider.getCopilotContactsByCompany(String(params.companyName)),
  });
}
