import { useAuditedFrontendTool as useFrontendTool } from "./useAuditedFrontendTool";
import { useDataProvider } from "ra-core";
import { z } from "zod";
import { toLeadPriority } from "@/lib/copilotContacts";
import type { CrmDataProvider } from "../../providers/types";

export function useGetTopLeads() {
  const dataProvider = useDataProvider<CrmDataProvider>();

  useFrontendTool({
    name: "getTopLeads",
    description:
      "Get the top leads ranked by lead score. Returns contacts with the highest lead scores.",
    parameters: z.object({
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of top leads to return (default: 10)"),
    }),
    handler: async (params) => {
      const rows = await dataProvider.getTopCopilotLeads(
        typeof params.limit === "number" ? params.limit : 10,
      );
      return rows.map(toLeadPriority);
    },
  });
}
