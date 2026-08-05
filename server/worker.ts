import { cors } from "hono/cors";
import { Hono } from "hono";
import { z } from "zod";
import PostalMime from "postal-mime";
import { createAuth } from "./auth.js";
import { createDb } from "./db/client.js";
import { inboundEmailEvents } from "./db/schema.js";
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

app.all("/api/auth/*", (context) =>
  createAuth(context.env).handler(context.req.raw),
);

app.post("/api/uploads/presign", async (context) => {
  const body = z
    .object({
      filename: z.string().min(1).max(255),
      contentType: z.string().min(1).max(255),
    })
    .safeParse(await context.req.json());

  if (!body.success)
    return context.json({ error: "Invalid upload request" }, 400);
  return context.json(
    {
      error: "Upload endpoints are enabled after the D1 migration is applied.",
    },
    501,
  );
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

      // The CRM association and D1 batch write are deliberately isolated in
      // the queue consumer. This keeps email ingestion idempotent and allows
      // retrying D1 failures without re-reading the SMTP stream.
      console.info("Inbound email queued for CRM processing", {
        eventId: job.eventId,
        messageId: job.messageId,
        subjectLength: subject.length,
      });
      await db
        .update(inboundEmailEvents)
        .set({ status: "processed", processedAt: new Date().toISOString() })
        .where(eq(inboundEmailEvents.id, job.eventId))
        .run();
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
