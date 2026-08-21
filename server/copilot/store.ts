import { and, desc, eq, type SQL } from "drizzle-orm";
import { createDb } from "../db/client.js";
import {
  attachments,
  companies,
  contactInsights,
  contacts,
  copilotAudit,
  notes,
} from "../db/schema.js";
import {
  contactsByCompany,
  filterCopilotContacts,
  rankTopLeads,
  type CopilotContact,
  type CopilotContactFilters,
} from "../../src/lib/copilotContacts.js";

type Database = ReturnType<typeof createDb>;

const toContact = (row: {
  contact: typeof contacts.$inferSelect;
  companyName: string | null;
  insights: typeof contactInsights.$inferSelect | null;
}): CopilotContact => ({
  id: row.contact.id,
  first_name: row.contact.firstName,
  last_name: row.contact.lastName,
  gender: row.contact.gender,
  title: row.contact.jobTitle,
  company_name: row.companyName ?? "",
  company_id: row.contact.companyId,
  status: row.contact.status,
  lifecycle_stage: row.insights?.lifecycleStage ?? null,
  lead_score: row.insights?.leadScore ?? 0,
  last_activity_date: row.insights?.lastActivityDate ?? null,
  last_activity_type: row.insights?.lastActivityType ?? null,
  renewal_amount: row.insights?.renewalAmount ?? null,
  renewal_date: row.insights?.renewalDate ?? null,
  renewal_forecast_category: row.insights?.renewalForecastCategory ?? null,
  renewal_probability: row.insights?.renewalProbability ?? null,
  contract_file: row.insights?.contractAttachmentId ?? null,
  economic_buyer_identified: row.insights?.economicBuyerIdentified ?? false,
  budget_confirmed: row.insights?.budgetConfirmed ?? false,
  legal_review_status: row.insights?.legalReviewStatus ?? null,
  security_review_status: row.insights?.securityReviewStatus ?? null,
  champion_confidence: row.insights?.championConfidence ?? null,
  competitor: row.insights?.competitor ?? null,
  next_best_action: row.insights?.nextBestAction ?? null,
  notes_summary: row.insights?.notesSummary ?? null,
});

const listJoined = async (db: Database) => {
  const rows = await db
    .select({
      contact: contacts,
      companyName: companies.name,
      insights: contactInsights,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .leftJoin(contactInsights, eq(contactInsights.contactId, contacts.id))
    .all();
  return rows.map(toContact);
};

export const searchCopilotContacts = async (
  database: D1Database,
  filters: CopilotContactFilters,
) => filterCopilotContacts(await listJoined(createDb(database)), filters);

export const getCopilotContact = async (database: D1Database, id: number) =>
  (await listJoined(createDb(database))).find((contact) => contact.id === id);

export const getCopilotContactsByCompany = async (
  database: D1Database,
  company: string,
) => {
  const numericId = Number(company);
  const all = await listJoined(createDb(database));
  if (Number.isSafeInteger(numericId) && String(numericId) === company) {
    const companyContacts = all.filter(
      (contact) => contact.company_id === numericId,
    );
    return contactsByCompany(
      companyContacts,
      companyContacts[0]?.company_name ?? company,
    );
  }
  return contactsByCompany(all, company);
};

export const getTopCopilotLeads = async (database: D1Database, limit: number) =>
  rankTopLeads(await listJoined(createDb(database)), limit);

export const updateCopilotForecast = async (
  database: D1Database,
  id: number,
  update: {
    renewal_forecast_category?: string;
    renewal_probability?: number;
  },
) => {
  const db = createDb(database);
  const now = new Date().toISOString();
  const [existing] = await db
    .select({ contactId: contactInsights.contactId })
    .from(contactInsights)
    .where(eq(contactInsights.contactId, id))
    .limit(1)
    .all();
  if (existing) {
    await db
      .update(contactInsights)
      .set({
        ...(update.renewal_forecast_category === undefined
          ? {}
          : { renewalForecastCategory: update.renewal_forecast_category }),
        ...(update.renewal_probability === undefined
          ? {}
          : { renewalProbability: update.renewal_probability }),
        updatedAt: now,
      })
      .where(eq(contactInsights.contactId, id))
      .run();
  } else {
    const [contact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1)
      .all();
    if (!contact) return undefined;
    await db
      .insert(contactInsights)
      .values({
        contactId: id,
        renewalForecastCategory: update.renewal_forecast_category ?? null,
        renewalProbability: update.renewal_probability ?? null,
        updatedAt: now,
      })
      .run();
  }
  return getCopilotContact(database, id);
};

const decodeObject = async (value: R2ObjectBody | null) => {
  if (!value) return null;
  return value.text();
};

export const getCopilotContract = async (
  env: Pick<Env, "DB" | "BUCKET">,
  params: { contactId?: number; companyName?: string },
) => {
  const db = createDb(env.DB);
  let contactId = params.contactId;
  if (contactId == null && params.companyName) {
    const grouped = await getCopilotContactsByCompany(
      env.DB,
      params.companyName,
    );
    contactId =
      grouped.contacts.find((contact) => contact.contract_file)?.id ??
      grouped.contacts[0]?.id;
  }
  if (contactId == null) {
    return { contactId: null, filename: null, text: "" };
  }

  const [insight] = await db
    .select()
    .from(contactInsights)
    .where(eq(contactInsights.contactId, contactId))
    .limit(1)
    .all();

  if (insight?.contractAttachmentId) {
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, insight.contractAttachmentId))
      .limit(1)
      .all();
    if (attachment) {
      const object = await env.BUCKET.get(attachment.objectKey);
      const text = await decodeObject(object);
      if (text != null) {
        return {
          contactId,
          filename: attachment.filename,
          text,
        };
      }
    }
  }

  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.contactId, contactId), eq(notes.source, "contract")))
    .orderBy(desc(notes.createdAt))
    .limit(1)
    .all();
  if (note) {
    return {
      contactId,
      filename: note.title ?? "contract.md",
      text: note.content,
    };
  }

  const [contact] = await db
    .select({ companyId: contacts.companyId })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1)
    .all();
  if (contact?.companyId != null) {
    const [companyNote] = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.companyId, contact.companyId),
          eq(notes.source, "contract"),
        ),
      )
      .orderBy(desc(notes.createdAt))
      .limit(1)
      .all();
    if (companyNote) {
      return {
        contactId,
        filename: companyNote.title ?? "contract.md",
        text: companyNote.content,
      };
    }
  }

  return { contactId, filename: null, text: "" };
};

export const writeCopilotAudit = async (
  database: D1Database,
  event: {
    actionType: string;
    toolName?: string | null;
    contactName?: string | null;
    companyName?: string | null;
    summary?: string;
    salesId?: number | null;
  },
) => {
  const record = {
    id: crypto.randomUUID(),
    actionType: event.actionType || "tool_call",
    toolName: event.toolName ?? null,
    contactName: event.contactName ?? null,
    companyName: event.companyName ?? null,
    summary: event.summary ?? "",
    salesId: event.salesId ?? null,
    createdAt: new Date().toISOString(),
  };
  await createDb(database).insert(copilotAudit).values(record).run();
  return record;
};

export const listCopilotAudit = async (
  database: D1Database,
  filters: { contactName?: string; companyName?: string },
) => {
  const clauses: SQL[] = [];
  if (filters.contactName) {
    clauses.push(eq(copilotAudit.contactName, filters.contactName));
  }
  if (filters.companyName) {
    clauses.push(eq(copilotAudit.companyName, filters.companyName));
  }
  return createDb(database)
    .select()
    .from(copilotAudit)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(copilotAudit.createdAt))
    .limit(200)
    .all();
};
