import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

const workerOrigin = (
  process.env.COPILOT_CRM_ORIGIN || "http://127.0.0.1:8787"
).replace(/\/$/, "");

const crmHeaders = () => {
  const headers = new Headers({ Accept: "application/json" });
  if (process.env.MCP_AUTH_COOKIE) {
    headers.set("Cookie", process.env.MCP_AUTH_COOKIE);
  }
  if (process.env.MCP_AUTH_BEARER) {
    headers.set("Authorization", `Bearer ${process.env.MCP_AUTH_BEARER}`);
  }
  return headers;
};

const crmFetch = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${workerOrigin}${path}`, {
    ...init,
    headers: {
      ...Object.fromEntries(crmHeaders()),
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof (body as { error?: string }).error === "string"
        ? (body as { error: string }).error
        : `CRM request failed (${response.status})`,
    );
  }
  return body;
};

const createMcpServer = () => {
  const server = new McpServer({
    name: "atomic-crm",
    version: "0.1.0",
  });

  server.tool(
    "searchContacts",
    "Search CRM contacts stored in D1",
    {
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      company: z.string().optional(),
      status: z.string().optional(),
    },
    async (params) => {
      const search = new URLSearchParams();
      if (params.firstName) search.set("first_name", params.firstName);
      if (params.lastName) search.set("last_name", params.lastName);
      if (params.company) search.set("company", params.company);
      if (params.status) search.set("status", params.status);
      const contacts = await crmFetch(`/api/contacts?${search}`);
      return {
        content: [{ type: "text", text: JSON.stringify(contacts, null, 2) }],
      };
    },
  );

  server.tool(
    "getTopLeads",
    "Return top CRM leads by lead score",
    { limit: z.number().int().min(1).max(100).optional() },
    async (params) => {
      const leads = await crmFetch(
        `/api/leads/top?limit=${params.limit ?? 10}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(leads, null, 2) }],
      };
    },
  );

  server.tool(
    "analyzeContract",
    "Load stored contract text for a contact id",
    { contactId: z.number().int().positive() },
    async (params) => {
      const contract = await crmFetch(
        `/api/contacts/${params.contactId}/contract`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(contract, null, 2) }],
      };
    },
  );

  server.tool(
    "createTask",
    "Create a follow-up task on an existing CRM contact",
    {
      contactId: z.number().int().positive(),
      text: z.string(),
      dueDate: z.string().optional(),
    },
    async (params) => {
      const task = await crmFetch("/api/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: params.contactId,
          title: params.text,
          text: params.text,
          due_date: params.dueDate,
        }),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
      };
    },
  );

  return server;
};

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url?.startsWith("/mcp")) {
      try {
        const server = createMcpServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        await server.connect(transport);
        await transport.handleRequest(req, res);
      } catch (err) {
        console.error("MCP request error:", err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end("Internal server error");
        }
      }
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  },
);

const port = parseInt(process.env.PORT || process.env.MCP_PORT || "3108", 10);
httpServer.listen(port, () => {
  console.log(`Atomic CRM MCP server running on http://localhost:${port}/mcp`);
});
