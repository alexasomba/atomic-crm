import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createAuth } from "../auth.js";
import { createDb } from "../db/client.js";
import { sales } from "../db/schema.js";
import {
  getCopilotContact,
  getCopilotContactsByCompany,
  getCopilotContract,
  getTopCopilotLeads,
  listCopilotAudit,
  searchCopilotContacts,
  updateCopilotForecast,
  writeCopilotAudit,
} from "../copilot/store.js";

type CopilotEnv = {
  Bindings: Env;
  Variables: { sale: typeof sales.$inferSelect };
};

const api = new Hono<CopilotEnv>();

const requireSale = async (context: Context<CopilotEnv>) => {
  if (!context.env?.APP_ORIGIN) {
    return context.json({ error: "Unauthorized" }, 401);
  }
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
  return null;
};

const optionalNumber = (value: string | undefined) => {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

api.get("/contacts", async (context) => {
  const denied = await requireSale(context);
  if (denied) return denied;
  const contacts = await searchCopilotContacts(context.env.DB, {
    firstName: context.req.query("first_name"),
    lastName: context.req.query("last_name"),
    company: context.req.query("company"),
    lifecycleStage: context.req.query("lifecycle_stage"),
    leadScoreMin: optionalNumber(context.req.query("lead_score_min")),
    leadScoreMax: optionalNumber(context.req.query("lead_score_max")),
    status: context.req.query("status"),
  });
  return context.json(contacts);
});

api.get("/contacts/:id/contract", async (context) => {
  const denied = await requireSale(context);
  if (denied) return denied;
  const id = Number(context.req.param("id"));
  if (!Number.isSafeInteger(id))
    return context.json({ error: "Invalid contact id" }, 400);
  return context.json(await getCopilotContract(context.env, { contactId: id }));
});

api.patch("/contacts/:id/forecast", async (context) => {
  const denied = await requireSale(context);
  if (denied) return denied;
  if (context.get("sale").role !== "admin")
    return context.json({ error: "Forbidden" }, 403);
  const id = Number(context.req.param("id"));
  const body = z
    .object({
      renewal_forecast_category: z.string().max(100).optional(),
      renewal_probability: z.number().int().min(0).max(100).optional(),
    })
    .safeParse(await context.req.json());
  if (!Number.isSafeInteger(id) || !body.success)
    return context.json({ error: "Invalid forecast update" }, 400);
  const updated = await updateCopilotForecast(context.env.DB, id, body.data);
  return updated
    ? context.json(updated)
    : context.json({ error: "Contact not found" }, 404);
});

api.get("/contacts/:id", async (context) => {
  const denied = await requireSale(context);
  if (denied) return denied;
  const id = Number(context.req.param("id"));
  if (!Number.isSafeInteger(id))
    return context.json({ error: "Invalid contact id" }, 400);
  const contact = await getCopilotContact(context.env.DB, id);
  return contact
    ? context.json(contact)
    : context.json({ error: "Contact not found" }, 404);
});

api.get("/companies/:company/contacts", async (context) => {
  const denied = await requireSale(context);
  if (denied) return denied;
  return context.json(
    await getCopilotContactsByCompany(
      context.env.DB,
      decodeURIComponent(context.req.param("company")),
    ),
  );
});

api.get("/leads/top", async (context) => {
  const denied = await requireSale(context);
  if (denied) return denied;
  const limit = Math.min(
    Math.max(optionalNumber(context.req.query("limit")) ?? 10, 1),
    100,
  );
  return context.json(await getTopCopilotLeads(context.env.DB, limit));
});

api.post("/audit", async (context) => {
  const denied = await requireSale(context);
  if (denied) return denied;
  const body = z
    .object({
      actionType: z.string().max(100).optional(),
      toolName: z.string().max(200).nullable().optional(),
      contactName: z.string().max(300).nullable().optional(),
      companyName: z.string().max(300).nullable().optional(),
      summary: z.string().max(2000).optional(),
    })
    .safeParse(await context.req.json());
  if (!body.success) return context.json({ error: body.error.flatten() }, 400);
  const event = await writeCopilotAudit(context.env.DB, {
    ...body.data,
    actionType: body.data.actionType ?? "tool_call",
    salesId: context.get("sale").id,
  });
  return context.json(event, 201);
});

api.get("/audit", async (context) => {
  const denied = await requireSale(context);
  if (denied) return denied;
  return context.json(
    await listCopilotAudit(context.env.DB, {
      contactName: context.req.query("contactName"),
      companyName: context.req.query("companyName"),
    }),
  );
});

export { api as copilotApi };
