type AuditEvent = {
  actionType: string;
  toolName: string | null;
  contactName: string | null;
  companyName: string | null;
  summary: string;
};

type AuditSink = (event: AuditEvent) => Promise<void>;

let auditSink: AuditSink = async () => {};

export function configureCopilotAudit(sink: AuditSink) {
  auditSink = sink;
}

const recentlyLogged = new Set<string>();

function makeKey(toolName: string, args: Record<string, unknown>): string {
  return `${toolName}:${JSON.stringify(args)}`;
}

function extractNames(args: Record<string, unknown>): {
  contactName: string | null;
  companyName: string | null;
} {
  return {
    contactName:
      (args.contactName as string) || (args.contact_name as string) || null,
    companyName:
      (args.companyName as string) ||
      (args.company as string) ||
      (args.company_name as string) ||
      null,
  };
}

const textArgument = (value: unknown, fallback = "") =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;

const summaryRules: Record<string, (args: Record<string, unknown>) => string> =
  {
    getContactsByCompany: (a) =>
      `Fetched contacts for ${textArgument(a.companyName || "unknown")}`,
    getTopLeads: (a) => `Fetched top ${textArgument(a.limit || 10)} leads`,
    searchContacts: (a) =>
      `Searched contacts${a.company ? ` for ${textArgument(a.company)}` : ""}`,
    createTask: (a) =>
      `Created task: ${textArgument(a.description || "untitled")}`,
    draftEmail: (a) =>
      `Drafted email to ${textArgument(a.contactName || "unknown")}: ${textArgument(a.subject || "")}`,
    updateContactStatus: (a) =>
      `Updated contact status to ${textArgument(a.status || "unknown")}`,
    listDeals: (a) =>
      `Listed deals${a.companyName ? ` for ${textArgument(a.companyName)}` : ""}`,
    updateDeal: (a) => `Updated deal ${textArgument(a.dealId ?? "")}`,
    createNote: (a) =>
      `Created a note for contact ${textArgument(a.contactId ?? "")}`,
    analyzeContract: (a) =>
      `Loaded contract for ${textArgument(a.companyName || a.contactId || "unknown")}`,
  };

function generateSummary(
  toolName: string,
  args: Record<string, unknown>,
): string {
  if (typeof args.summary === "string" && args.summary.length > 0) {
    return args.summary;
  }
  const rule = summaryRules[toolName];
  if (rule) return rule(args);
  return `Called ${toolName}`;
}

async function postAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await auditSink(event);
  } catch {
    // Audit logging should never break the app.
  }
}

export async function logToolCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<void> {
  const key = makeKey(toolName, args);
  recentlyLogged.add(key);
  setTimeout(() => recentlyLogged.delete(key), 10_000);

  const { contactName, companyName } = extractNames(args);
  await postAuditEvent({
    actionType: "tool_call",
    toolName,
    contactName,
    companyName,
    summary: generateSummary(toolName, args),
  });
}

export async function logComponentRender(
  toolName: string,
  args: Record<string, unknown>,
): Promise<void> {
  const key = makeKey(toolName, args);
  if (recentlyLogged.has(key)) return;

  const { contactName, companyName } = extractNames(args);
  await postAuditEvent({
    actionType: "component_render",
    toolName,
    contactName,
    companyName,
    summary: `Rendered ${toolName}`,
  });
}

export async function logAgentSummary(summary: string): Promise<void> {
  await postAuditEvent({
    actionType: "agent_summary",
    toolName: null,
    contactName: null,
    companyName: null,
    summary,
  });
}
