import { useAuditedFrontendTool as useFrontendTool } from "./useAuditedFrontendTool";
import { useDataProvider } from "ra-core";
import { z } from "zod";
import type { Deal } from "../../types";

export function useListDeals() {
  const dataProvider = useDataProvider();

  useFrontendTool({
    name: "listDeals",
    description:
      "List CRM deals. Filter by company id when known. Do not invent deal ids.",
    parameters: z.object({
      companyId: z.number().optional().describe("Company id from CRM records"),
      companyName: z
        .string()
        .optional()
        .describe("Company name for audit context"),
    }),
    handler: async (params) => {
      const { data } = await dataProvider.getList<Deal>("deals", {
        filter:
          typeof params.companyId === "number"
            ? { company_id: params.companyId }
            : {},
        pagination: { page: 1, perPage: 100 },
        sort: { field: "id", order: "DESC" },
      });
      return data.map((deal) => ({
        id: deal.id,
        name: deal.name,
        amount: deal.amount,
        stage: deal.stage,
        company_id: deal.company_id,
        contact_ids: deal.contact_ids,
      }));
    },
  });
}

export function useUpdateDeal() {
  const dataProvider = useDataProvider();

  useFrontendTool({
    name: "updateDeal",
    description:
      "Update an existing deal's stage or status. ALWAYS use a deal id returned by listDeals.",
    parameters: z.object({
      dealId: z.number().describe("Existing deal id"),
      stage: z.string().optional().describe("New deal stage"),
      status: z.string().optional().describe("New deal status"),
    }),
    handler: async (params) => {
      const dealId = Number(params.dealId);
      const { data: previous } = await dataProvider.getOne<Deal>("deals", {
        id: dealId,
      });
      const { data } = await dataProvider.update<Deal>("deals", {
        id: dealId,
        data: {
          ...(typeof params.stage === "string" ? { stage: params.stage } : {}),
          ...(typeof params.status === "string"
            ? { status: params.status }
            : {}),
        },
        previousData: previous,
      });
      return { id: data.id, stage: data.stage, name: data.name };
    },
  });
}

export function useCreateNote() {
  const dataProvider = useDataProvider();

  useFrontendTool({
    name: "createNote",
    description:
      "Create a note on an existing contact. ALWAYS use a contactId from searchContacts.",
    parameters: z.object({
      contactId: z.number().describe("Existing contact id"),
      text: z.string().describe("Note body"),
      status: z
        .enum(["cold", "warm", "hot", "in-contract"])
        .optional()
        .describe("Optional contact status for the note"),
    }),
    handler: async (params) => {
      const contactId = Number(params.contactId);
      await dataProvider.getOne("contacts", { id: contactId });
      const result = await dataProvider.create("contact_notes", {
        data: {
          contact_id: contactId,
          text: String(params.text),
          content: String(params.text),
          date: new Date().toISOString(),
          status: typeof params.status === "string" ? params.status : undefined,
        },
      });
      return { success: true, noteId: result.data.id };
    },
  });
}
