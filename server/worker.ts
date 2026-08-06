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
import { desc, eq, or, sql } from "drizzle-orm";
import { handleNativeCopilotKit } from "./copilotkit.js";

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

const proxyCopilotKit = async (context: {
  req: { raw: Request };
  env: Env;
}) => {
  const runtimeUrl = context.env.COPILOTKIT_RUNTIME_URL.trim();
  if (!runtimeUrl) {
    return new Response(
      JSON.stringify({
        error:
          "CopilotKit runtime is not configured for this Worker. Set COPILOTKIT_RUNTIME_URL or use the Node runtime.",
      }),
      {
        status: 501,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const incoming = new URL(context.req.raw.url);
  const target = new URL(runtimeUrl);
  target.pathname = `${target.pathname.replace(/\/$/, "")}${incoming.pathname.replace(/^\/api\/copilotkit/, "")}`;
  target.search = incoming.search;

  const headers = new Headers(context.req.raw.headers);
  headers.delete("Host");
  const body =
    context.req.raw.method === "GET" || context.req.raw.method === "HEAD"
      ? undefined
      : context.req.raw.body;
  const requestInit: RequestInit & { duplex?: "half" } = {
    method: context.req.raw.method,
    headers,
    body,
    redirect: "manual",
  };
  // Node's Fetch implementation requires this for streamed request bodies;
  // Cloudflare accepts the same RequestInit without inspecting the extension.
  if (body) requestInit.duplex = "half";
  return fetch(new Request(target, requestInit));
};

const copilotKit = async (context: { req: { raw: Request }; env: Env }) => {
  if (context.env.COPILOTKIT_RUNTIME_MODE === "proxy") {
    return proxyCopilotKit(context);
  }
  return handleNativeCopilotKit(context.req.raw, context.env);
};

app.all("/api/copilotkit", copilotKit);
app.all("/api/copilotkit/*", copilotKit);

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

const getAdminSale = async (env: Env, headers: Headers) => {
  const session = await createAuth(env).api.getSession({ headers });
  if (!session) return null;
  const [sale] = await createDb(env.DB)
    .select({ id: sales.id, role: sales.role })
    .from(sales)
    .where(eq(sales.userId, session.user.id))
    .limit(1)
    .all();
  return sale?.role === "admin" ? sale : null;
};

app.get("/api/admin/inbound-email-events", async (context) => {
  const sale = await getAdminSale(context.env, context.req.raw.headers);
  if (!sale)
    return context.json({ error: "Administrator access required" }, 403);
  const limit = Math.min(Number(context.req.query("limit") ?? 50), 100);
  const events = await createDb(context.env.DB)
    .select({
      id: inboundEmailEvents.id,
      messageId: inboundEmailEvents.messageId,
      sender: inboundEmailEvents.sender,
      recipient: inboundEmailEvents.recipient,
      subject: inboundEmailEvents.subject,
      status: inboundEmailEvents.status,
      error: inboundEmailEvents.error,
      createdAt: inboundEmailEvents.createdAt,
      processedAt: inboundEmailEvents.processedAt,
    })
    .from(inboundEmailEvents)
    .orderBy(desc(inboundEmailEvents.createdAt))
    .limit(Number.isSafeInteger(limit) && limit > 0 ? limit : 50)
    .all();
  return context.json({ data: events });
});

app.post("/api/admin/inbound-email-events/:id/replay", async (context) => {
  const sale = await getAdminSale(context.env, context.req.raw.headers);
  if (!sale)
    return context.json({ error: "Administrator access required" }, 403);

  const eventId = context.req.param("id");
  const db = createDb(context.env.DB);
  const [event] = await db
    .select()
    .from(inboundEmailEvents)
    .where(eq(inboundEmailEvents.id, eventId))
    .limit(1)
    .all();
  if (!event) return context.json({ error: "Inbound event not found" }, 404);
  if (event.status === "processed" || event.status === "queued") {
    return context.json(
      { error: `Event is already ${event.status}`, data: event },
      409,
    );
  }

  await db
    .update(inboundEmailEvents)
    .set({ status: "queued", error: null, processedAt: null })
    .where(eq(inboundEmailEvents.id, eventId))
    .run();
  await context.env.INBOUND_EMAIL_QUEUE.send({
    eventId: event.id,
    messageId: event.messageId,
    r2Key: event.r2Key,
    sender: event.sender,
    recipient: event.recipient,
    receivedAt: event.createdAt,
  } satisfies InboundEmailJob);
  return context.json({ data: { ...event, status: "queued" } });
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
  const [sale] = await createDb(context.env.DB)
    .select({ id: sales.id, role: sales.role })
    .from(sales)
    .where(eq(sales.userId, session.user.id))
    .limit(1)
    .all();
  if (!sale) return context.json({ error: "CRM identity unavailable" }, 403);

  const form = await context.req.formData();
  const file = form.get("file");
  const noteIdValue = form.get("noteId");
  if (!(file instanceof File))
    return context.json({ error: "file is required" }, 400);

  const noteId = noteIdValue ? Number(noteIdValue) : null;
  if (
    noteId !== null &&
    Number.isSafeInteger(noteId) &&
    sale.role !== "admin"
  ) {
    const [note] = await createDb(context.env.DB)
      .select({ salesId: notes.salesId })
      .from(notes)
      .where(eq(notes.id, noteId))
      .limit(1)
      .all();
    if (!note || (note.salesId !== null && note.salesId !== sale.id))
      return context.json({ error: "Attachment access denied" }, 403);
  }

  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `attachments/${session.user.id}/${crypto.randomUUID()}-${filename}`;
  await context.env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  const attachment = {
    id: crypto.randomUUID(),
    noteId: Number.isSafeInteger(noteId) ? noteId : null,
    objectKey: key,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    createdAt: new Date().toISOString(),
  };
  try {
    await createDb(context.env.DB).insert(attachments).values(attachment).run();
  } catch (error) {
    await context.env.BUCKET.delete(key);
    throw error;
  }
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
  const [sale] = await createDb(context.env.DB)
    .select({ id: sales.id, role: sales.role })
    .from(sales)
    .where(eq(sales.userId, session.user.id))
    .limit(1)
    .all();
  if (!sale) return context.json({ error: "CRM identity unavailable" }, 403);

  const key = decodeURIComponent(context.req.path.replace("/api/uploads/", ""));
  if (!key || key.includes(".."))
    return context.json({ error: "Invalid key" }, 400);
  const [attachment] = await createDb(context.env.DB)
    .select({ noteId: attachments.noteId })
    .from(attachments)
    .where(eq(attachments.objectKey, key))
    .limit(1)
    .all();
  const ownsKey = key.startsWith(`attachments/${session.user.id}/`);
  if (!attachment) return context.json({ error: "Attachment not found" }, 404);
  if (!ownsKey && sale.role !== "admin" && attachment.noteId !== null) {
    const [note] = await createDb(context.env.DB)
      .select({ salesId: notes.salesId })
      .from(notes)
      .where(eq(notes.id, attachment.noteId))
      .limit(1)
      .all();
    if (!note || note.salesId !== sale.id)
      return context.json({ error: "Attachment access denied" }, 403);
  }
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
  const [sale] = await createDb(context.env.DB)
    .select({ id: sales.id, role: sales.role })
    .from(sales)
    .where(eq(sales.userId, session.user.id))
    .limit(1)
    .all();
  if (!sale) return context.json({ error: "CRM identity unavailable" }, 403);

  const key = decodeURIComponent(context.req.path.replace("/api/uploads/", ""));
  if (!key || key.includes(".."))
    return context.json({ error: "Invalid key" }, 400);
  const [attachment] = await createDb(context.env.DB)
    .select({ noteId: attachments.noteId })
    .from(attachments)
    .where(eq(attachments.objectKey, key))
    .limit(1)
    .all();
  const ownsKey = key.startsWith(`attachments/${session.user.id}/`);
  if (
    !attachment ||
    (!ownsKey && sale.role !== "admin" && attachment.noteId !== null)
  )
    return context.json({ error: "Attachment access denied" }, 403);
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

  const db = createDb(env.DB);
  const existing = await db
    .select({ id: inboundEmailEvents.id })
    .from(inboundEmailEvents)
    .where(eq(inboundEmailEvents.messageId, messageId))
    .limit(1);

  // Check idempotency before writing to R2 so a duplicate Message-ID cannot
  // create an orphaned raw message.
  if (existing.length > 0) return;

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

  try {
    await db
      .insert(inboundEmailEvents)
      .values({
        id: eventId,
        messageId,
        r2Key,
        sender: message.from,
        recipient: message.to,
        subject: getHeader(message, "subject") || null,
        status: "queued",
        createdAt: job.receivedAt,
      })
      .run();
  } catch (error) {
    // D1 and R2 do not share a transaction. Remove the raw object when the
    // event record cannot be created; otherwise retries would leak storage.
    await env.BUCKET.delete(r2Key);
    throw error;
  }

  ctx.waitUntil(env.INBOUND_EMAIL_QUEUE.send(job));
};

const queueHandler = async (batch: MessageBatch<unknown>, env: Env) => {
  for (const message of batch.messages) {
    const job = message.body as InboundEmailJob;
    const uploadedAttachmentKeys: string[] = [];
    try {
      const eventDb = createDb(env.DB);
      const [event] = await eventDb
        .select({ status: inboundEmailEvents.status })
        .from(inboundEmailEvents)
        .where(eq(inboundEmailEvents.id, job.eventId))
        .limit(1)
        .all();
      if (
        !event ||
        event.status === "processed" ||
        event.status === "unmatched"
      ) {
        message.ack();
        continue;
      }

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
      const normalizedSender = sender.trim().toLowerCase();
      const [contact] = await db
        .select({ id: contacts.id, salesId: contacts.salesId })
        .from(contacts)
        .where(
          or(
            sql`lower(${contacts.email}) = ${normalizedSender}`,
            sql`EXISTS (
              SELECT 1 FROM json_each(COALESCE(${contacts.emailJson}, '[]')) AS email_entry
              WHERE lower(json_extract(email_entry.value, '$.email')) = ${normalizedSender}
            )`,
          ),
        )
        .limit(1)
        .all();

      if (!contact) {
        await db
          .update(inboundEmailEvents)
          .set({
            status: "unmatched",
            error: `No CRM contact matched ${normalizedSender}`,
            processedAt: new Date().toISOString(),
          })
          .where(eq(inboundEmailEvents.id, job.eventId))
          .run();
        console.warn("Inbound email did not match a CRM contact", {
          eventId: job.eventId,
          sender,
        });
        message.ack();
        continue;
      }

      const random = new Uint32Array(1);
      crypto.getRandomValues(random);
      const noteId = Date.now() * 100 + (random[0] % 100);
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
        uploadedAttachmentKeys.push(row.objectKey);
      }

      const noteContent = (parsed.text || parsed.html || "").slice(0, 100_000);
      const now = new Date().toISOString();
      await db.batch([
        db.insert(notes).values({
          id: noteId,
          contactId: contact.id,
          salesId: contact.salesId,
          title: subject.slice(0, 500) || "Inbound email",
          content: noteContent,
          source: "inbound_email",
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(activities).values({
          id: activityId,
          contactId: contact.id,
          salesId: contact.salesId,
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
      // Attachment objects are written before the D1 batch because D1 cannot
      // transactionally include R2. Remove only objects created by this
      // attempt, then let the queue retry the durable raw message.
      await Promise.allSettled(
        uploadedAttachmentKeys.map((key) => env.BUCKET.delete(key)),
      );
      console.error("Inbound email processing failed", {
        eventId: job.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      await createDb(env.DB)
        .update(inboundEmailEvents)
        .set({
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        })
        .where(eq(inboundEmailEvents.id, job.eventId))
        .run();
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
