import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import * as authSchema from "./auth-schema.js";

const jsonText = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

export const companies = sqliteTable(
  "companies",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    sector: text("sector"),
    size: integer("size"),
    linkedinUrl: text("linkedin_url"),
    website: text("website"),
    phoneNumber: text("phone_number"),
    address: text("address"),
    zipcode: text("zipcode"),
    city: text("city"),
    stateAbbr: text("state_abbr"),
    salesId: integer("sales_id").references(() => sales.id),
    contextLinks: jsonText<unknown>("context_links"),
    country: text("country"),
    description: text("description"),
    revenue: text("revenue"),
    taxIdentifier: text("tax_identifier"),
    logo: jsonText<unknown>("logo"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("companies_name_idx").on(table.name)],
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: integer("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    emailJson: jsonText<unknown[]>("email_json"),
    phone: text("phone"),
    phoneJson: jsonText<unknown[]>("phone_json"),
    phone1Number: text("phone_1_number"),
    phone1Type: text("phone_1_type"),
    phone2Number: text("phone_2_number"),
    phone2Type: text("phone_2_type"),
    jobTitle: text("job_title"),
    gender: text("gender"),
    background: text("background"),
    acquisition: text("acquisition"),
    avatar: jsonText<unknown>("avatar"),
    firstSeen: text("first_seen"),
    lastSeen: text("last_seen"),
    hasNewsletter: integer("has_newsletter", { mode: "boolean" }),
    status: text("status"),
    companyId: integer("company_id").references(() => companies.id),
    salesId: integer("sales_id").references(() => sales.id),
    linkedinUrl: text("linkedin_url"),
    tags: jsonText<string[]>("tags").notNull().default([]),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("contacts_company_id_idx").on(table.companyId),
    index("contacts_email_idx").on(table.email),
  ],
);

export const sales = sqliteTable(
  "sales",
  {
    id: integer("id").primaryKey(),
    userId: text("user_id"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("user"),
    disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    avatar: jsonText<unknown>("avatar"),
  },
  (table) => [uniqueIndex("sales_email_idx").on(table.email)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey(),
    contactId: integer("contact_id").references(() => contacts.id),
    companyId: integer("company_id").references(() => companies.id),
    salesId: integer("sales_id").references(() => sales.id),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type"),
    text: text("text"),
    status: text("status").notNull(),
    dueDate: text("due_date"),
    doneDate: text("done_date"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("tasks_contact_id_idx").on(table.contactId),
    index("tasks_due_date_idx").on(table.dueDate),
  ],
);

export const deals = sqliteTable(
  "deals",
  {
    id: integer("id").primaryKey(),
    contactId: integer("contact_id").references(() => contacts.id),
    companyId: integer("company_id").references(() => companies.id),
    contactIds: jsonText<number[]>("contact_ids").notNull().default([]),
    salesId: integer("sales_id").references(() => sales.id),
    name: text("name").notNull(),
    category: text("category"),
    description: text("description"),
    amount: integer("amount"),
    stage: text("stage").notNull(),
    status: text("status").notNull(),
    archivedAt: text("archived_at"),
    position: integer("position").notNull().default(0),
    expectedClosingDate: text("expected_closing_date"),
    metadata: jsonText<Record<string, unknown>>("metadata")
      .notNull()
      .default({}),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("deals_status_stage_idx").on(table.status, table.stage)],
);

export const notes = sqliteTable(
  "notes",
  {
    id: integer("id").primaryKey(),
    contactId: integer("contact_id").references(() => contacts.id),
    dealId: integer("deal_id").references(() => deals.id),
    companyId: integer("company_id").references(() => companies.id),
    salesId: integer("sales_id").references(() => sales.id),
    title: text("title"),
    content: text("content").notNull(),
    source: text("source").notNull().default("manual"),
    status: text("status"),
    attachments: jsonText<unknown[]>("attachments"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("notes_contact_id_idx").on(table.contactId)],
);

export const activities = sqliteTable(
  "activities",
  {
    id: integer("id").primaryKey(),
    contactId: integer("contact_id").references(() => contacts.id),
    salesId: integer("sales_id").references(() => sales.id),
    type: text("type").notNull(),
    metadata: jsonText<Record<string, unknown>>("metadata")
      .notNull()
      .default({}),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("activities_contact_id_idx").on(table.contactId)],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    noteId: integer("note_id").references(() => notes.id),
    objectKey: text("object_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("attachments_note_id_idx").on(table.noteId)],
);

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
});

export const configuration = sqliteTable("configuration", {
  key: text("key").primaryKey(),
  value: jsonText<unknown>("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const inboundEmailEvents = sqliteTable(
  "inbound_email_events",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id").notNull(),
    r2Key: text("r2_key").notNull(),
    sender: text("sender").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject"),
    status: text("status").notNull().default("queued"),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    processedAt: text("processed_at"),
  },
  (table) => [uniqueIndex("inbound_email_message_id_idx").on(table.messageId)],
);

export const applicationSchema = {
  companies,
  contacts,
  sales,
  tasks,
  deals,
  notes,
  activities,
  attachments,
  tags,
  configuration,
  inboundEmailEvents,
};

export const schema = { ...applicationSchema, ...authSchema };
