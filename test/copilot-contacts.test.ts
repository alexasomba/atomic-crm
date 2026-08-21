import { describe, expect, it } from "vite-plus/test";
import {
  contactsByCompany,
  filterCopilotContacts,
  rankTopLeads,
  type CopilotContact,
} from "../src/lib/copilotContacts";
import { createDataProvider } from "../src/components/atomic-crm/providers/fakerest/dataProvider";
import type { Db } from "../src/components/atomic-crm/providers/fakerest/dataGenerator/types";

const contact = (
  id: number,
  company: string,
  score: number,
): CopilotContact => ({
  id,
  first_name: id === 1 ? "Ada" : "Grace",
  last_name: id === 1 ? "Lovelace" : "Hopper",
  gender: null,
  title: "Engineer",
  company_name: company,
  company_id: id,
  status: id === 1 ? "hot" : "warm",
  lifecycle_stage: "Qualified",
  lead_score: score,
  last_activity_date: "2026-01-01",
  last_activity_type: "Email",
  renewal_amount: 5000,
  renewal_date: null,
  renewal_forecast_category: "pipeline",
  renewal_probability: 40,
  contract_file: null,
  economic_buyer_identified: true,
  budget_confirmed: false,
  legal_review_status: null,
  security_review_status: null,
  champion_confidence: null,
  competitor: null,
  next_best_action: "Call",
  notes_summary: null,
});

describe("copilot contact queries", () => {
  const contacts = [
    contact(1, "Analytical Engines", 91),
    contact(2, "Navy", 40),
  ];

  it("filters by name and company", () => {
    expect(
      filterCopilotContacts(contacts, {
        firstName: "ada",
        lastName: "lovelace",
      }).map((row) => row.id),
    ).toEqual([1]);
    expect(
      filterCopilotContacts(contacts, { company: "navy" }).map((row) => row.id),
    ).toEqual([2]);
  });

  it("ranks top leads by score", () => {
    expect(rankTopLeads(contacts, 1).map((row) => row.id)).toEqual([1]);
  });

  it("summarizes company contacts", () => {
    expect(contactsByCompany(contacts, "Analytical Engines").stats).toEqual({
      total: 1,
      hot: 1,
      warm: 0,
      cold: 0,
      inContract: 0,
    });
  });
});

describe("FakeRest copilot methods", () => {
  it("reads insights and persists forecast updates", async () => {
    const db = {
      companies: [
        {
          id: 1,
          name: "Schmitt and Sons",
          logo: { src: "", title: "" },
          sector: "it",
          size: 50,
          linkedin_url: "",
          website: "",
          phone_number: "",
          address: "",
          zipcode: "",
          city: "",
          state_abbr: "",
          created_at: "2026-01-01T00:00:00.000Z",
          description: "",
          revenue: "",
          tax_identifier: "",
          country: "USA",
          nb_contacts: 1,
          nb_deals: 0,
        },
      ],
      contacts: [
        {
          id: 8,
          first_name: "Margaret",
          last_name: "Haley",
          title: "Ops",
          company_id: 1,
          company_name: "Schmitt and Sons",
          email_jsonb: [],
          first_seen: "2026-01-01T00:00:00.000Z",
          last_seen: "2026-01-01T00:00:00.000Z",
          has_newsletter: false,
          tags: [],
          gender: "female",
          sales_id: 0,
          status: "warm",
          background: "",
          phone_jsonb: [],
        },
      ],
      contact_insights: [
        {
          id: 8,
          contact_id: 8,
          lifecycle_stage: "Qualified",
          lead_score: 74,
          last_activity_date: "2026-03-01",
          last_activity_type: "Email",
          renewal_amount: null,
          renewal_date: null,
          renewal_forecast_category: "pipeline",
          renewal_probability: 20,
          contract_attachment_id: null,
          contract_text: "# Schmitt contract\n**[HIGH RISK]** Late fees.",
          economic_buyer_identified: true,
          budget_confirmed: true,
          legal_review_status: "Complete",
          security_review_status: "Complete",
          champion_confidence: "Medium",
          competitor: null,
          next_best_action: "Schedule discovery call",
          notes_summary: "Ops stakeholder",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      copilot_audit: [],
      contact_notes: [],
      deals: [],
      deal_notes: [],
      sales: [
        {
          id: 0,
          first_name: "Jane",
          last_name: "Doe",
          administrator: true,
          email: "jane@example.com",
          user_id: "0",
        },
      ],
      tags: [],
      tasks: [],
      configuration: [{ id: 1, config: {} }],
    } as unknown as Db;

    const dataProvider = createDataProvider({ db, latency: 0 });
    const matches = await dataProvider.searchCopilotContacts({
      company: "Schmitt",
    });
    expect(matches).toHaveLength(1);
    const contract = await dataProvider.getContactContract(8);
    expect(contract.text).toContain("HIGH RISK");
    const updated = await dataProvider.updateRenewalForecast(8, {
      renewal_forecast_category: "commit",
      renewal_probability: 75,
    });
    expect(updated.renewal_forecast_category).toBe("commit");
    expect(updated.renewal_probability).toBe(75);
    await dataProvider.logCopilotAudit({
      actionType: "tool_call",
      toolName: "updateRenewalForecast",
      contactName: "Margaret Haley",
      companyName: "Schmitt and Sons",
      summary: "Approved forecast",
    });
    const audit = await dataProvider.listCopilotAudit();
    expect(audit[0]?.summary).toBe("Approved forecast");
  });
});
