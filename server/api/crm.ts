import { Hono } from "hono";
import type { Context } from "hono";
import { count, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { createAuth } from "../auth.js";
import { createDb } from "../db/client.js";
import {
  activities,
  companies,
  contacts,
  deals,
  notes,
  sales,
  tasks,
} from "../db/schema.js";

const contactInput = z.object({
  first_name: z.string().min(1).max(200),
  last_name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(100).optional(),
  job_title: z.string().max(200).optional(),
  company_id: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().max(100)).max(100).optional(),
});

const salesInput = z.object({
  email: z.email(),
  first_name: z.string().min(1).max(200),
  last_name: z.string().min(1).max(200),
  administrator: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

const companyInput = z.object({
  name: z.string().min(1).max(300),
  sector: z.string().max(200).nullable().optional(),
  size: z.number().int().nullable().optional(),
  linkedin_url: z.string().max(500).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  phone_number: z.string().max(100).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  zipcode: z.string().max(50).nullable().optional(),
  city: z.string().max(200).nullable().optional(),
  state_abbr: z.string().max(20).nullable().optional(),
  sales_id: z.number().int().positive().nullable().optional(),
  context_links: z.unknown().nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  description: z.string().max(100_000).nullable().optional(),
  revenue: z.string().max(100).nullable().optional(),
  tax_identifier: z.string().max(200).nullable().optional(),
  logo: z.unknown().nullable().optional(),
});

const taskInput = z.object({
  contact_id: z.number().int().positive().nullable().optional(),
  company_id: z.number().int().positive().nullable().optional(),
  sales_id: z.number().int().positive().nullable().optional(),
  title: z.string().max(500).optional(),
  description: z.string().max(100_000).nullable().optional(),
  type: z.string().max(100).nullable().optional(),
  text: z.string().max(100_000).nullable().optional(),
  status: z.string().max(100).optional(),
  due_date: z.string().nullable().optional(),
  done_date: z.string().nullable().optional(),
});

const dealInput = z.object({
  contact_id: z.number().int().positive().nullable().optional(),
  contact_ids: z.array(z.number().int().positive()).optional(),
  company_id: z.number().int().positive().nullable().optional(),
  sales_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(500).optional(),
  category: z.string().max(200).nullable().optional(),
  description: z.string().max(100_000).nullable().optional(),
  amount: z.number().int().nullable().optional(),
  stage: z.string().max(100).optional(),
  status: z.string().max(100).optional(),
  archived_at: z.string().nullable().optional(),
  position: z.number().int().optional(),
  index: z.number().int().optional(),
  expected_closing_date: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const noteInput = z.object({
  contact_id: z.number().int().positive().nullable().optional(),
  deal_id: z.number().int().positive().nullable().optional(),
  company_id: z.number().int().positive().nullable().optional(),
  sales_id: z.number().int().positive().nullable().optional(),
  title: z.string().max(500).nullable().optional(),
  content: z.string().max(100_000).optional(),
  text: z.string().max(100_000).optional(),
  source: z.string().max(100).optional(),
  status: z.string().max(100).nullable().optional(),
  attachments: z.array(z.unknown()).nullable().optional(),
});

type CrmEnv = {
  Bindings: Env;
  Variables: { sale: typeof sales.$inferSelect };
};

const api = new Hono<CrmEnv>();

const readTables = { activities, deals, notes, tasks } as const;

const writableResources = {
  tasks: { table: tasks, input: taskInput },
  deals: { table: deals, input: dealInput },
  notes: { table: notes, input: noteInput },
  contact_notes: { table: notes, input: noteInput },
  deal_notes: { table: notes, input: noteInput },
} as const;

const normalizeWritable = (
  resource: keyof typeof writableResources,
  input: Record<string, unknown>,
  now: string,
) => {
  if (resource === "tasks") {
    return {
      contactId: input.contact_id ?? null,
      companyId: input.company_id ?? null,
      salesId: input.sales_id ?? null,
      title: input.title ?? input.text ?? input.type ?? "Task",
      description: input.description ?? input.text ?? null,
      type: input.type ?? null,
      text: input.text ?? null,
      status: input.status ?? "pending",
      dueDate: input.due_date ?? null,
      doneDate: input.done_date ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }
  if (resource === "deals") {
    const contactIds = input.contact_ids ?? [];
    return {
      contactId: input.contact_id ?? (contactIds as number[])[0] ?? null,
      companyId: input.company_id ?? null,
      contactIds,
      salesId: input.sales_id ?? null,
      name: input.name ?? "Deal",
      category: input.category ?? null,
      description: input.description ?? null,
      amount: input.amount ?? null,
      stage: input.stage ?? "default",
      status: input.status ?? "open",
      archivedAt: input.archived_at ?? null,
      position: input.position ?? input.index ?? 0,
      expectedClosingDate: input.expected_closing_date ?? null,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
  }
  return {
    contactId: input.contact_id ?? null,
    dealId: input.deal_id ?? null,
    companyId: input.company_id ?? null,
    salesId: input.sales_id ?? null,
    title:
      input.title ?? (resource === "deal_notes" ? "Deal note" : "Contact note"),
    content: input.content ?? input.text ?? "",
    source: input.source ?? "manual",
    status: input.status ?? null,
    attachments: input.attachments ?? null,
    createdAt: now,
    updatedAt: now,
  };
};

api.use("/*", async (context, next) => {
  const session = await createAuth(context.env).api.getSession({
    headers: context.req.raw.headers,
  });
  if (!session) return context.json({ error: "Unauthorized" }, 401);
  const [sale] = await createDb(context.env.DB)
    .select()
    .from(sales)
    .where(eq(sales.userId, session.user.id))
    .limit(1)
    .all();
  if (!sale || sale.disabled)
    return context.json({ error: "Account disabled" }, 403);
  context.set("sale", sale);
  await next();
});

const requireAdministrator = (context: Context<CrmEnv>) => {
  const sale = context.get("sale");
  return sale.role === "admin";
};

api.get("/companies", async (context) => {
  const page = Math.max(Number(context.req.query("page") ?? 1), 1);
  const perPage = Math.min(
    Math.max(Number(context.req.query("perPage") ?? 25), 1),
    100,
  );
  const query = context.req.query("q")?.trim();
  const where = query ? like(companies.name, `%${query}%`) : undefined;
  const db = createDb(context.env.DB);
  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(companies)
      .where(where)
      .orderBy(companies.name)
      .limit(perPage)
      .offset((page - 1) * perPage)
      .all(),
    db.select({ total: count() }).from(companies).where(where).all(),
  ]);
  return context.json({ data, total });
});

api.post("/companies", async (context) => {
  const body = companyInput.safeParse(await context.req.json());
  if (!body.success) return context.json({ error: body.error.flatten() }, 400);
  const now = new Date().toISOString();
  const [company] = await createDb(context.env.DB)
    .insert(companies)
    .values({
      name: body.data.name,
      sector: body.data.sector ?? null,
      size: body.data.size ?? null,
      linkedinUrl: body.data.linkedin_url ?? null,
      website: body.data.website ?? null,
      phoneNumber: body.data.phone_number ?? null,
      address: body.data.address ?? null,
      zipcode: body.data.zipcode ?? null,
      city: body.data.city ?? null,
      stateAbbr: body.data.state_abbr ?? null,
      salesId: body.data.sales_id ?? null,
      contextLinks: body.data.context_links ?? null,
      country: body.data.country ?? null,
      description: body.data.description ?? null,
      revenue: body.data.revenue ?? null,
      taxIdentifier: body.data.tax_identifier ?? null,
      logo: body.data.logo ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all();
  return context.json({ data: company }, 201);
});

api.patch("/companies/:id", async (context) => {
  const id = Number(context.req.param("id"));
  const body = companyInput.partial().safeParse(await context.req.json());
  if (!Number.isSafeInteger(id) || !body.success)
    return context.json({ error: "Invalid company update" }, 400);
  const input = body.data;
  const [company] = await createDb(context.env.DB)
    .update(companies)
    .set({
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.sector === undefined ? {} : { sector: input.sector }),
      ...(input.size === undefined ? {} : { size: input.size }),
      ...(input.linkedin_url === undefined
        ? {}
        : { linkedinUrl: input.linkedin_url }),
      ...(input.website === undefined ? {} : { website: input.website }),
      ...(input.phone_number === undefined
        ? {}
        : { phoneNumber: input.phone_number }),
      ...(input.address === undefined ? {} : { address: input.address }),
      ...(input.zipcode === undefined ? {} : { zipcode: input.zipcode }),
      ...(input.city === undefined ? {} : { city: input.city }),
      ...(input.state_abbr === undefined
        ? {}
        : { stateAbbr: input.state_abbr }),
      ...(input.sales_id === undefined ? {} : { salesId: input.sales_id }),
      ...(input.context_links === undefined
        ? {}
        : { contextLinks: input.context_links }),
      ...(input.country === undefined ? {} : { country: input.country }),
      ...(input.description === undefined
        ? {}
        : { description: input.description }),
      ...(input.revenue === undefined ? {} : { revenue: input.revenue }),
      ...(input.tax_identifier === undefined
        ? {}
        : { taxIdentifier: input.tax_identifier }),
      ...(input.logo === undefined ? {} : { logo: input.logo }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(companies.id, id))
    .returning()
    .all();
  return company
    ? context.json({ data: company })
    : context.json({ error: "Company not found" }, 404);
});

api.delete("/companies/:id", async (context) => {
  const id = Number(context.req.param("id"));
  if (!Number.isSafeInteger(id))
    return context.json({ error: "Invalid company id" }, 400);
  const [company] = await createDb(context.env.DB)
    .delete(companies)
    .where(eq(companies.id, id))
    .returning()
    .all();
  return company
    ? context.json({ data: company })
    : context.json({ error: "Company not found" }, 404);
});

api.get("/sales", async (context) => {
  if (!requireAdministrator(context))
    return context.json({ error: "Forbidden" }, 403);
  const rows = await createDb(context.env.DB).select().from(sales).all();
  return context.json({
    data: rows.map((sale) => ({
      id: sale.id,
      user_id: sale.userId,
      first_name: sale.firstName,
      last_name: sale.lastName,
      email: sale.email,
      administrator: sale.role === "admin",
      disabled: sale.disabled,
    })),
    total: rows.length,
  });
});

api.post("/sales", async (context) => {
  if (!requireAdministrator(context))
    return context.json({ error: "Forbidden" }, 403);
  const body = salesInput.safeParse(await context.req.json());
  if (!body.success) return context.json({ error: body.error.flatten() }, 400);

  // The user is created with a one-time random password and receives a
  // Better Auth reset link immediately. The password never leaves this
  // request and is not persisted by the CRM layer.
  const temporaryPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const authResponse = await createAuth(context.env).handler(
    new Request(`${context.env.APP_ORIGIN}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: body.data.email,
        password: temporaryPassword,
        name: `${body.data.first_name} ${body.data.last_name}`,
      }),
    }),
  );
  if (!authResponse.ok) {
    const error = await authResponse.json().catch(() => ({}));
    return context.json({ error }, authResponse.status as 400 | 409 | 422);
  }

  const created = (await authResponse.json()) as { user?: { id: string } };
  if (!created.user?.id)
    return context.json({ error: "Authentication user was not created" }, 502);

  const db = createDb(context.env.DB);
  const now = new Date().toISOString();
  const [sale] = await db
    .update(sales)
    .set({
      firstName: body.data.first_name,
      lastName: body.data.last_name,
      role: body.data.administrator ? "admin" : "user",
      disabled: body.data.disabled ?? false,
      updatedAt: now,
    })
    .where(eq(sales.userId, created.user.id))
    .returning()
    .all();

  if (!sale)
    return context.json({ error: "Sales record was not created" }, 502);

  // Best-effort reset delivery: account creation remains successful even if
  // the email provider is temporarily unavailable; the operator can retry
  // the reset flow from the login screen.
  await createAuth(context.env)
    .handler(
      new Request(`${context.env.APP_ORIGIN}/api/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: body.data.email,
          redirectTo: `${context.env.APP_ORIGIN}/reset-password`,
        }),
      }),
    )
    .catch(() => undefined);

  return context.json(
    {
      data: {
        id: sale.id,
        user_id: sale.userId,
        first_name: sale.firstName,
        last_name: sale.lastName,
        email: sale.email,
        administrator: sale.role === "admin",
        disabled: sale.disabled,
      },
    },
    201,
  );
});

api.patch("/sales/:id", async (context) => {
  if (!requireAdministrator(context))
    return context.json({ error: "Forbidden" }, 403);
  const id = Number(context.req.param("id"));
  const body = z
    .object({
      email: z.string().email().optional(),
      first_name: z.string().min(1).max(200).optional(),
      last_name: z.string().min(1).max(200).optional(),
      administrator: z.boolean().optional(),
      disabled: z.boolean().optional(),
    })
    .safeParse(await context.req.json());
  if (!Number.isSafeInteger(id) || !body.success)
    return context.json({ error: "Invalid sales update" }, 400);
  const [current] = await createDb(context.env.DB)
    .select({ email: sales.email })
    .from(sales)
    .where(eq(sales.id, id))
    .limit(1)
    .all();
  if (!current) return context.json({ error: "Sales record not found" }, 404);
  if (body.data.email !== undefined && body.data.email !== current.email)
    return context.json(
      { error: "Email changes require the Better Auth email-change flow" },
      409,
    );
  const [sale] = await createDb(context.env.DB)
    .update(sales)
    .set({
      ...(body.data.first_name === undefined
        ? {}
        : { firstName: body.data.first_name }),
      ...(body.data.last_name === undefined
        ? {}
        : { lastName: body.data.last_name }),
      ...(body.data.administrator === undefined
        ? {}
        : { role: body.data.administrator ? "admin" : "user" }),
      ...(body.data.disabled === undefined
        ? {}
        : { disabled: body.data.disabled }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sales.id, id))
    .returning()
    .all();
  return sale
    ? context.json({ data: sale })
    : context.json({ error: "Sales record not found" }, 404);
});

api.get("/:resource", async (context) => {
  const table =
    readTables[context.req.param("resource") as keyof typeof readTables];
  if (!table) return context.json({ error: "Resource not found" }, 404);

  const page = Math.max(Number(context.req.query("page") ?? 1), 1);
  const perPage = Math.min(
    Math.max(Number(context.req.query("perPage") ?? 25), 1),
    100,
  );
  const db = createDb(context.env.DB);
  const rows = await db
    .select()
    .from(table as never)
    .limit(perPage)
    .offset((page - 1) * perPage)
    .all();
  return context.json({ data: rows, total: rows.length });
});

api.get("/:resource/:id", async (context) => {
  const table =
    readTables[context.req.param("resource") as keyof typeof readTables];
  const id = Number(context.req.param("id"));
  if (!table) return context.json({ error: "Resource not found" }, 404);
  if (!Number.isSafeInteger(id))
    return context.json({ error: "Invalid id" }, 400);

  const [row] = await createDb(context.env.DB)
    .select()
    .from(table as never)
    .where(eq((table as typeof tasks).id, id))
    .limit(1)
    .all();
  return row
    ? context.json({ data: row })
    : context.json({ error: "Record not found" }, 404);
});

api.get("/contacts", async (context) => {
  const db = createDb(context.env.DB);
  const page = Math.max(Number(context.req.query("page") ?? 1), 1);
  const perPage = Math.min(
    Math.max(Number(context.req.query("perPage") ?? 25), 1),
    100,
  );
  const query = context.req.query("q")?.trim();
  const where = query
    ? or(
        like(contacts.firstName, `%${query}%`),
        like(contacts.lastName, `%${query}%`),
        like(contacts.email, `%${query}%`),
      )
    : undefined;

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(where)
      .limit(perPage)
      .offset((page - 1) * perPage)
      .all(),
    db.select({ total: count() }).from(contacts).where(where).all(),
  ]);

  return context.json({ data, total });
});

api.get("/contacts/:id", async (context) => {
  const id = Number(context.req.param("id"));
  if (!Number.isSafeInteger(id))
    return context.json({ error: "Invalid id" }, 400);

  const [contact] = await createDb(context.env.DB)
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1)
    .all();

  return contact
    ? context.json({ data: contact })
    : context.json({ error: "Contact not found" }, 404);
});

api.post("/contacts", async (context) => {
  const parsed = contactInput.safeParse(await context.req.json());
  if (!parsed.success)
    return context.json({ error: parsed.error.flatten() }, 400);

  const now = new Date().toISOString();
  const input = parsed.data;
  const [contact] = await createDb(context.env.DB)
    .insert(contacts)
    .values({
      firstName: input.first_name,
      lastName: input.last_name,
      email: input.email || null,
      phone: input.phone ?? null,
      jobTitle: input.job_title ?? null,
      companyId: input.company_id ?? null,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all();

  return context.json({ data: contact }, 201);
});

api.patch("/contacts/:id", async (context) => {
  const id = Number(context.req.param("id"));
  if (!Number.isSafeInteger(id))
    return context.json({ error: "Invalid id" }, 400);
  const parsed = contactInput.partial().safeParse(await context.req.json());
  if (!parsed.success)
    return context.json({ error: parsed.error.flatten() }, 400);
  const input = parsed.data;
  const [contact] = await createDb(context.env.DB)
    .update(contacts)
    .set({
      ...(input.first_name === undefined
        ? {}
        : { firstName: input.first_name }),
      ...(input.last_name === undefined ? {} : { lastName: input.last_name }),
      ...(input.email === undefined ? {} : { email: input.email || null }),
      ...(input.phone === undefined ? {} : { phone: input.phone ?? null }),
      ...(input.job_title === undefined
        ? {}
        : { jobTitle: input.job_title ?? null }),
      ...(input.company_id === undefined
        ? {}
        : { companyId: input.company_id ?? null }),
      ...(input.tags === undefined ? {} : { tags: input.tags }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(contacts.id, id))
    .returning()
    .all();

  return contact
    ? context.json({ data: contact })
    : context.json({ error: "Contact not found" }, 404);
});

api.delete("/contacts/:id", async (context) => {
  const id = Number(context.req.param("id"));
  if (!Number.isSafeInteger(id))
    return context.json({ error: "Invalid id" }, 400);
  const [contact] = await createDb(context.env.DB)
    .delete(contacts)
    .where(eq(contacts.id, id))
    .returning()
    .all();

  return contact
    ? context.json({ data: contact })
    : context.json({ error: "Contact not found" }, 404);
});

api.post("/:resource", async (context) => {
  const resource = context.req.param(
    "resource",
  ) as keyof typeof writableResources;
  const definition = writableResources[resource];
  if (!definition) return context.json({ error: "Resource not found" }, 404);
  const parsed = definition.input.safeParse(await context.req.json());
  if (!parsed.success)
    return context.json({ error: parsed.error.flatten() }, 400);
  const now = new Date().toISOString();
  const values = normalizeWritable(resource, parsed.data, now);
  const [row] = await createDb(context.env.DB)
    .insert(definition.table as typeof tasks)
    .values(values as typeof tasks.$inferInsert)
    .returning()
    .all();
  return context.json({ data: row }, 201);
});

api.patch("/:resource/:id", async (context) => {
  const resource = context.req.param(
    "resource",
  ) as keyof typeof writableResources;
  const definition = writableResources[resource];
  const id = Number(context.req.param("id"));
  if (!definition) return context.json({ error: "Resource not found" }, 404);
  if (!Number.isSafeInteger(id))
    return context.json({ error: "Invalid id" }, 400);
  const parsed = definition.input.partial().safeParse(await context.req.json());
  if (!parsed.success)
    return context.json({ error: parsed.error.flatten() }, 400);
  const values = normalizeWritable(
    resource,
    parsed.data,
    new Date().toISOString(),
  );
  delete (values as Record<string, unknown>).createdAt;
  const [row] = await createDb(context.env.DB)
    .update(definition.table as typeof tasks)
    .set(values as never)
    .where(eq((definition.table as typeof tasks).id, id))
    .returning()
    .all();
  return row
    ? context.json({ data: row })
    : context.json({ error: "Record not found" }, 404);
});

api.delete("/:resource/:id", async (context) => {
  const resource = context.req.param(
    "resource",
  ) as keyof typeof writableResources;
  const definition = writableResources[resource];
  const id = Number(context.req.param("id"));
  if (!definition) return context.json({ error: "Resource not found" }, 404);
  if (!Number.isSafeInteger(id))
    return context.json({ error: "Invalid id" }, 400);
  const [row] = await createDb(context.env.DB)
    .delete(definition.table as typeof tasks)
    .where(eq((definition.table as typeof tasks).id, id))
    .returning()
    .all();
  return row
    ? context.json({ data: row })
    : context.json({ error: "Record not found" }, 404);
});

api.post("/contacts/merge", async (context) => {
  const body = z
    .object({
      sourceId: z.number().int().positive(),
      targetId: z.number().int().positive(),
    })
    .safeParse(await context.req.json());
  if (!body.success || body.data.sourceId === body.data.targetId)
    return context.json({ error: "Invalid contact merge" }, 400);

  const db = createDb(context.env.DB);
  const [source, target] = await Promise.all([
    db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.id, body.data.sourceId))
      .limit(1)
      .all(),
    db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.id, body.data.targetId))
      .limit(1)
      .all(),
  ]);
  if (!source[0] || !target[0])
    return context.json({ error: "Contact not found" }, 404);

  await db.batch([
    db
      .update(tasks)
      .set({ contactId: body.data.targetId })
      .where(eq(tasks.contactId, body.data.sourceId)),
    db
      .update(deals)
      .set({ contactId: body.data.targetId })
      .where(eq(deals.contactId, body.data.sourceId)),
    db
      .update(notes)
      .set({ contactId: body.data.targetId })
      .where(eq(notes.contactId, body.data.sourceId)),
    db
      .update(activities)
      .set({ contactId: body.data.targetId })
      .where(eq(activities.contactId, body.data.sourceId)),
    db.delete(contacts).where(eq(contacts.id, body.data.sourceId)),
  ]);
  return context.json({ data: { id: body.data.targetId } });
});

api.post("/deals/:id/unarchive", async (context) => {
  const id = Number(context.req.param("id"));
  if (!Number.isSafeInteger(id))
    return context.json({ error: "Invalid deal id" }, 400);
  const [deal] = await createDb(context.env.DB)
    .update(deals)
    .set({
      archivedAt: null,
      status: "open",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(deals.id, id))
    .returning()
    .all();
  return deal
    ? context.json({ data: deal })
    : context.json({ error: "Deal not found" }, 404);
});

export { api as crmApi };
