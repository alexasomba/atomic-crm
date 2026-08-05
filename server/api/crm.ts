import { Hono } from "hono";
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

const api = new Hono<{ Bindings: Env }>();

const readTables = { activities, deals, notes, tasks } as const;

api.use("/*", async (context, next) => {
  const session = await createAuth(context.env).api.getSession({
    headers: context.req.raw.headers,
  });
  if (!session) return context.json({ error: "Unauthorized" }, 401);
  await next();
});

api.get("/companies", async (context) => {
  const db = createDb(context.env.DB);
  const rows = await db.select().from(companies).orderBy(companies.name).all();
  return context.json({ data: rows, total: rows.length });
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

export { api as crmApi };
