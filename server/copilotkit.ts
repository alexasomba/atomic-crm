import { createWorkersAiChat } from "@cloudflare/tanstack-ai";
import { chat } from "@tanstack/ai";
import { EventType } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";

type RunInput = {
  runId?: string;
  threadId?: string;
  messages?: Array<{
    role: string;
    content?: unknown;
    toolCalls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
    toolCallId?: string;
  }>;
  context?: Array<{ description: string; value: unknown }>;
  state?: unknown;
  tools?: Array<{
    name: string;
    description?: string;
    parameters?: unknown;
  }>;
};

const agentDescription = "Atomic CRM revenue operations copilot";
const agentPrompt = `You are the Atomic CRM revenue operations copilot.

Use only data provided by the application, frontend tools, and CRM APIs. Prefer
structured UI components registered by the frontend over markdown. Keep answers
concise and actionable. Forecast mutations require the existing human approval
flow. Never invent CRM records, metrics, or contract contents.`;

const toTanStackInput = (input: RunInput) => {
  const messages = (input.messages ?? [])
    .filter((message) => ["user", "assistant", "tool"].includes(message.role))
    .map((message) => ({
      role: message.role as "user" | "assistant" | "tool",
      content:
        message.role === "user" || typeof message.content === "string"
          ? (message.content as string)
          : null,
      ...(message.toolCalls ? { toolCalls: message.toolCalls } : {}),
      ...(message.toolCallId ? { toolCallId: message.toolCallId } : {}),
    }));

  const systemPrompts = [agentPrompt];
  for (const message of input.messages ?? []) {
    if (
      (message.role === "system" || message.role === "developer") &&
      message.content
    ) {
      systemPrompts.push(
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content),
      );
    }
  }
  for (const context of input.context ?? []) {
    systemPrompts.push(`${context.description}:\n${String(context.value)}`);
  }
  if (input.state && typeof input.state === "object") {
    systemPrompts.push(`Application State:\n${JSON.stringify(input.state)}`);
  }

  const tools = (input.tools ?? []).map((tool) => ({
    __toolSide: "client" as const,
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: tool.parameters ?? { type: "object", properties: {} },
  }));

  return { messages, systemPrompts, tools };
};

const encode = (encoder: EventEncoder, event: object) =>
  new TextEncoder().encode(encoder.encode(event as never));

const streamRun = async (request: Request, env: Env, input: RunInput) => {
  const threadId = input.threadId ?? crypto.randomUUID();
  const runId = input.runId ?? crypto.randomUUID();
  const encoder = new EventEncoder();
  const stream = new TransformStream<Uint8Array>();
  const writer = stream.writable.getWriter();
  const abortController = new AbortController();
  request.signal.addEventListener("abort", () => abortController.abort(), {
    once: true,
  });

  void (async () => {
    try {
      await writer.write(
        encode(encoder, {
          type: EventType.RUN_STARTED,
          threadId,
          runId,
        }),
      );
      const { messages, systemPrompts, tools } = toTanStackInput(input);
      const adapter = createWorkersAiChat(
        env.CLOUDFLARE_AI_MODEL || "@cf/openai/gpt-oss-20b",
        { binding: env.AI },
      );
      const response = chat({
        adapter,
        messages,
        systemPrompts,
        tools,
        abortController,
      });

      for await (const event of response) {
        if (abortController.signal.aborted) break;
        if (
          event.type === EventType.RUN_STARTED ||
          event.type === EventType.RUN_FINISHED
        ) {
          continue;
        }
        await writer.write(encode(encoder, event));
      }
      if (!abortController.signal.aborted) {
        await writer.write(
          encode(encoder, { type: EventType.RUN_FINISHED, threadId, runId }),
        );
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        await writer.write(
          encode(encoder, {
            type: EventType.RUN_ERROR,
            message: error instanceof Error ? error.message : "AI run failed",
          }),
        );
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
};

export const handleNativeCopilotKit = async (request: Request, env: Env) => {
  if (!env.AI) {
    return Response.json(
      { error: "Workers AI binding is not configured for this Worker." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  if (url.pathname.endsWith("/info")) {
    return Response.json({
      version: "tanstack-ai",
      agents: {
        default: {
          name: "default",
          description: agentDescription,
          className: "CloudflareTanStackAIAgent",
        },
      },
      mode: "native",
      suggestions: true,
      telemetryDisabled: true,
    });
  }

  if (
    request.method !== "POST" ||
    !url.pathname.endsWith("/agent/default/run")
  ) {
    return Response.json(
      { error: "CopilotKit route not found" },
      { status: 404 },
    );
  }

  const input = (await request.json()) as RunInput;
  return streamRun(request, env, input);
};
