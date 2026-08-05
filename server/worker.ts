import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { Hono } from "hono";
import { z } from "zod";
import PostalMime from "postal-mime";
import { createAuth } from "./auth.js";
import { crmApi } from "./api/crm.js";
import { createDb } from "./db/client.js";
import {
  attachments,
  activities,
  configuration,
  contacts,
  inboundEmailEvents,
  notes,
  sales,
} from "./db/schema.js";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/api/*",
  cors({
    origin: (origin, context) =>
      origin === context.env.APP_ORIGIN ? origin : context.env.APP_ORIGIN,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use("/api/*", async (context, next) => {
  const requestId = context.req.header("X-Request-ID") ?? crypto.randomUUID();
  context.header("X-Request-ID", requestId);
  await next();
});

app.get("/api/health", (context) =>
  context.json({
    ok: true,
    environment: context.env.ENVIRONMENT,
    requestId: context.res.headers.get("X-Request-ID"),
  }),
);

app.get("/api/me", async (context) => {
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

  return context.json({
    data: {
      id: sale.id,
      user_id: session.user.id,
      first_name: sale.firstName,
      last_name: sale.lastName,
      email: sale.email,
      administrator: sale.role === "admin",
      disabled: sale.disabled,
      avatar: session.user.image,
    },
  });
});

app.get("/api/configuration", async (context) => {
  const session = await createAuth(context.env).api.getSession({
    headers: context.req.raw.headers,
  });
  if (!session) return context.json({ error: "Unauthorized" }, 401);
  const [record] = await createDb(context.env.DB)
    .select()
    .from(configuration)
    .where(eq(configuration.key, "crm"))
    .limit(1)
    .all();
  return context.json({ data: record?.value ?? {} });
});

app.patch("/api/configuration", async (context) => {
  const session = await createAuth(context.env).api.getSession({
    headers: context.req.raw.headers,
  });
  if (!session) return context.json({ error: "Unauthorized" }, 401);
  const body = z
    .record(z.string(), z.unknown())
    .safeParse(await context.req.json());
  if (!body.success)
    return context.json({ error: "Invalid configuration" }, 400);
  const now = new Date().toISOString();
  await createDb(context.env.DB)
    .insert(configuration)
    .values({ key: "crm", value: body.data, updatedAt: now })
    .onConflictDoUpdate({
      target: configuration.key,
      set: { value: body.data, updatedAt: now },
    })
    .run();
  return context.json({ data: body.data });
});

app.all("/api/auth/*", (context) =>
  createAuth(context.env).handler(context.req.raw),
);

app.route("/api/crm", crmApi);

app.use("/api/uploads/*", bodyLimit({ maxSize: 10 * 1024 * 1024 }));

app.post("/api/uploads", async (context) => {
  const session = await createAuth(context.env).api.getSession({
    headers: context.req.raw.headers,
  });
  if (!session) return context.json({ error: "Unauthorized" }, 401);

  const form = await context.req.formData();
  const file = form.get("file");
  const noteIdValue = form.get("noteId");
  if (!(file instanceof File))
    return context.json({ error: "file is required" }, 400);

  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `attachments/${session.user.id}/${crypto.randomUUID()}-${filename}`;
  await context.env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  const noteId = noteIdValue ? Number(noteIdValue) : null;
  const attachment = {
    id: crypto.randomUUID(),
    noteId: Number.isSafeInteger(noteId) ? noteId : null,
    objectKey: key,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    createdAt: new Date().toISOString(),
  };
  await createDb(context.env.DB).insert(attachments).values(attachment).run();
  return context.json(
    { data: { ...attachment, url: `/api/uploads/${key}` } },
    201,
  );
});

app.get("/api/uploads/*", async (context) => {
  const session = await createAuth(context.env).api.getSession({
    headers: context.req.raw.headers,
  });
  if (!session) return context.json({ error: "Unauthorized" }, 401);

  const key = decodeURIComponent(context.req.path.replace("/api/uploads/", ""));
  if (!key || key.includes(".."))
    return context.json({ error: "Invalid key" }, 400);
  const object = await context.env.BUCKET.get(key);
  if (!object) return context.json({ error: "Attachment not found" }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
});

app.delete("/api/uploads/*", async (context) => {
  const session = await createAuth(context.env).api.getSession({
    headers: context.req.raw.headers,
  });
  if (!session) return context.json({ error: "Unauthorized" }, 401);

  const key = decodeURIComponent(context.req.path.replace("/api/uploads/", ""));
  if (!key || key.includes(".."))
    return context.json({ error: "Invalid key" }, 400);
  await context.env.BUCKET.delete(key);
  await createDb(context.env.DB)
    .delete(attachments)
    .where(eq(attachments.objectKey, key))
    .run();
  return context.body(null, 204);
});

app.post("/api/ai", async (context) => {
  const session = await createAuth(context.env).api.getSession({
    headers: context.req.raw.headers,
  });
  if (!session) return context.json({ error: "Unauthorized" }, 401);

  const parsed = z
    .object({
      messages: z
        .array(
          z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string().min(1).max(8_000),
          }),
        )
        .min(1)
        .max(30),
    })
    .safeParse(await context.req.json());
  if (!parsed.success)
    return context.json({ error: "Invalid AI request" }, 400);

  const result = await context.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: parsed.data.messages,
  });
  return context.json(result);
});

app.notFound((context) => context.json({ error: "Not found" }, 404));

type InboundEmailJob = {
  eventId: string;
  messageId: string;
  r2Key: string;
  sender: string;
  recipient: string;
  receivedAt: string;
};

const getHeader = (message: ForwardableEmailMessage, name: string) =>
  message.headers.get(name) ?? "";

const emailHandler = async (
  message: ForwardableEmailMessage,
  env: Env,
  ctx: ExecutionContext,
) => {
  if (message.rawSize > 25 * 1024 * 1024) {
    message.setReject("Message exceeds the 25 MB inbound email limit");
    return;
  }

  if (
    message.to.toLowerCase() !== env.VITE_INBOUND_EMAIL_ADDRESS.toLowerCase()
  ) {
    message.setReject("Unknown recipient");
    return;
  }

  const raw = await new Response(message.raw).arrayBuffer();
  const eventId = crypto.randomUUID();
  const messageId = getHeader(message, "message-id") || eventId;
  const r2Key = `inbound/${new Date().toISOString().slice(0, 10)}/${eventId}.eml`;

  await env.BUCKET.put(r2Key, raw, {
    httpMetadata: { contentType: "message/rfc822" },
    customMetadata: {
      messageId,
      sender: message.from,
      recipient: message.to,
    },
  });

  const job: InboundEmailJob = {
    eventId,
    messageId,
    r2Key,
    sender: message.from,
    recipient: message.to,
    receivedAt: new Date().toISOString(),
  };

  const db = createDb(env.DB);
  const existing = await db
    .select({ id: inboundEmailEvents.id })
    .from(inboundEmailEvents)
    .where(eq(inboundEmailEvents.messageId, messageId))
    .limit(1);

  if (existing.length > 0) return;

  await db
    .insert(inboundEmailEvents)
    .values({
      id: eventId,
      messageId,
      r2Key,
      sender: message.from,
      recipient: message.to,
      status: "queued",
      createdAt: job.receivedAt,
    })
    .run();

  ctx.waitUntil(env.INBOUND_EMAIL_QUEUE.send(job));
};

const queueHandler = async (batch: MessageBatch<unknown>, env: Env) => {
  for (const message of batch.messages) {
    const job = message.body as InboundEmailJob;
    try {
      const object = await env.BUCKET.get(job.r2Key);
      if (!object)
        throw new Error(`Missing inbound email object: ${job.r2Key}`);

      const parsed = await new PostalMime().parse(await object.arrayBuffer());
      const subject = parsed.subject ?? "";
      const db = createDb(env.DB);
      const sender =
        parsed.from && "address" in parsed.from && parsed.from.address
          ? parsed.from.address
          : job.sender;
      const [contact] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.email, sender))
        .limit(1)
        .all();

      if (!contact) {
        await db
          .update(inboundEmailEvents)
          .set({ status: "unmatched", processedAt: new Date().toISOString() })
          .where(eq(inboundEmailEvents.id, job.eventId))
          .run();
        console.warn("Inbound email did not match a CRM contact", {
          eventId: job.eventId,
          sender,
        });
        message.ack();
        continue;
      }

      const noteId = Date.now() * 100 + Math.floor(Math.random() * 100);
      const activityId = noteId + 1;
      const attachmentRows = parsed.attachments.map((attachment, index) => ({
        id: crypto.randomUUID(),
        noteId,
        objectKey: `attachments/inbound/${job.eventId}/${index}-${(
          attachment.filename ?? "attachment"
        ).replace(/[^a-zA-Z0-9._-]/g, "_")}`,
        filename: attachment.filename ?? `attachment-${index}`,
        contentType: attachment.mimeType || "application/octet-stream",
        size:
          typeof attachment.content === "string"
            ? attachment.content.length
            : attachment.content.byteLength,
        createdAt: new Date().toISOString(),
      }));

      for (const [index, attachment] of parsed.attachments.entries()) {
        const row = attachmentRows[index];
        const content =
          typeof attachment.content === "string"
            ? attachment.content
            : attachment.content;
        await env.BUCKET.put(row.objectKey, content, {
          httpMetadata: { contentType: row.contentType },
        });
      }

      const noteContent = (parsed.text || parsed.html || "").slice(0, 100_000);
      const now = new Date().toISOString();
      await db.batch([
        db.insert(notes).values({
          id: noteId,
          contactId: contact.id,
          title: subject.slice(0, 500) || "Inbound email",
          content: noteContent,
          source: "inbound_email",
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(activities).values({
          id: activityId,
          contactId: contact.id,
          type: "inbound_email",
          metadata: { eventId: job.eventId, messageId: job.messageId },
          createdAt: now,
        }),
        ...attachmentRows.map((row) => db.insert(attachments).values(row)),
        db
          .update(inboundEmailEvents)
          .set({ status: "processed", processedAt: now })
          .where(eq(inboundEmailEvents.id, job.eventId)),
      ]);

      // The CRM association and D1 batch write are deliberately isolated in
      // the queue consumer. This keeps email ingestion idempotent and allows
      // retrying D1 failures without re-reading the SMTP stream.
      console.info("Inbound email queued for CRM processing", {
        eventId: job.eventId,
        messageId: job.messageId,
        subjectLength: subject.length,
      });
      message.ack();
    } catch (error) {
      console.error("Inbound email processing failed", {
        eventId: job.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      message.retry();
    }
  }
};

export const worker = {
  fetch: app.fetch,
  email: emailHandler,
  queue: queueHandler,
} satisfies ExportedHandler<Env>;

export { app };
export default worker;
