import { faker } from "@faker-js/faker";
import type { ContactInsights } from "../../../types";
import type { Db } from "./types";

const truthy = (value: string | undefined) =>
  value === "True" || value === "true" || value === "1";

const numberOrNull = (value: string | undefined) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const emptyInsights = (contactId: number): ContactInsights => ({
  id: contactId,
  contact_id: contactId,
  lifecycle_stage: null,
  lead_score: 0,
  last_activity_date: null,
  last_activity_type: null,
  renewal_amount: null,
  renewal_date: null,
  renewal_forecast_category: null,
  renewal_probability: null,
  contract_attachment_id: null,
  contract_text: null,
  economic_buyer_identified: false,
  budget_confirmed: false,
  legal_review_status: null,
  security_review_status: null,
  champion_confidence: null,
  competitor: null,
  next_best_action: null,
  notes_summary: null,
  updated_at: new Date().toISOString(),
});

export const insightFromCsvRow = (
  row: Record<string, string | undefined>,
  contactId: number,
  contractText?: string | null,
): ContactInsights => ({
  id: contactId,
  contact_id: contactId,
  lifecycle_stage: row.lifecycle_stage || null,
  lead_score: Number.parseInt(row.lead_score || "0", 10) || 0,
  last_activity_date: row.last_activity_date || null,
  last_activity_type: row.last_activity_type || null,
  renewal_amount: numberOrNull(row.renewal_amount),
  renewal_date: row.renewal_date || null,
  renewal_forecast_category: row.renewal_forecast_category || null,
  renewal_probability: numberOrNull(row.renewal_probability),
  contract_attachment_id: null,
  contract_text: contractText ?? null,
  economic_buyer_identified: truthy(row.economic_buyer_identified),
  budget_confirmed: truthy(row.budget_confirmed),
  legal_review_status: row.legal_review_status || null,
  security_review_status: row.security_review_status || null,
  champion_confidence: row.champion_confidence || null,
  competitor: row.competitor || null,
  next_best_action: row.next_best_action || null,
  notes_summary: row.notes_summary || null,
  updated_at: row.last_seen || new Date().toISOString(),
});

export const generateContactInsights = (db: Db): ContactInsights[] =>
  db.contacts.map((contact) => ({
    id: contact.id,
    contact_id: contact.id,
    lifecycle_stage: faker.helpers.arrayElement([
      "Lead",
      "Qualified",
      "Customer",
    ]),
    lead_score: faker.number.int({ min: 10, max: 99 }),
    last_activity_date: contact.last_seen,
    last_activity_type: faker.helpers.arrayElement([
      "Email",
      "Call",
      "Note",
      "Task",
    ]),
    renewal_amount: null,
    renewal_date: null,
    renewal_forecast_category: null,
    renewal_probability: null,
    contract_attachment_id: null,
    contract_text: null,
    economic_buyer_identified: faker.datatype.boolean(),
    budget_confirmed: faker.datatype.boolean(),
    legal_review_status: "Not Started",
    security_review_status: "Not Started",
    champion_confidence: "Medium",
    competitor: null,
    next_best_action: "Schedule follow-up",
    notes_summary: contact.background || null,
    updated_at: contact.last_seen,
  }));
