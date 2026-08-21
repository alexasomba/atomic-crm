import {
  useAgentContext,
  useDefaultRenderTool,
} from "@copilotkit/react-core/v2";
import { useGetIdentity } from "ra-core";
import { Loader2 } from "lucide-react";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { useRegisterComponents } from "./useRegisterComponents";
import { usePersona } from "./usePersona";
import { useSearchContacts } from "../tools/useSearchContacts";
import { useGetContactsByCompany } from "../tools/useGetContactsByCompany";
import { useGetTopLeads } from "../tools/useGetTopLeads";
import { useCreateTask } from "../tools/useCreateTask";
import { useDraftEmail } from "../tools/useDraftEmail";
import { useUpdateRenewalForecast } from "../tools/useUpdateRenewalForecast";
import { useUpdateContactStatus } from "../tools/useUpdateContactStatus";
import { useLogAuditEvent } from "../tools/useLogAuditEvent";
import { useAnalyzeContract } from "../tools/useAnalyzeContract";
import {
  useCreateNote,
  useListDeals,
  useUpdateDeal,
} from "../tools/useDealAndNoteTools";
import { logComponentRender } from "../tools/auditLogger";

interface CopilotSetupOptions {
  context: {
    description: string;
    value: any;
  };
}

export function useCopilotSetup({ context }: CopilotSetupOptions) {
  // Detect user role
  const { data: identity } = useGetIdentity({ staleTime: 0 });
  const isAdmin = !!(identity as { administrator?: boolean })?.administrator;

  // Detect persona from context (set via URL params or dropdown)
  const { persona } = usePersona();

  // Share app state with agent, including role and persona
  useAgentContext({
    description: context.description,
    value: {
      ...context.value,
      userRole: isAdmin ? "admin" : "user",
      ...(persona ? { persona } : {}),
    },
  });

  // Register all UI components (primitives + composites)
  useRegisterComponents();

  // Show tool execution status for backend/MCP tools only.
  // Skip tools that have their own rendering (HITL, useComponent).
  const ignoredTools = new Set([
    // HITL tool — has its own render with approve/reject buttons
    "updateRenewalForecast",
    // useComponent registrations — rendered by CopilotChatToolCallsView
    "Heading",
    "StatCard",
    "BulletList",
    "KeyValue",
    "Alert",
    "ProgressBar",
    "Badge",
    "MetricRow",
    "SignalList",
    "RiskSection",
    "ActionList",
    "ComparisonCard",
    "RankedList",
    "AccountSummary",
    "MissingSignals",
    "RiskIndicators",
    "NextActions",
    "ContractRiskReport",
    "LeadPriorityList",
    "analyzeContract",
    "listDeals",
    "updateDeal",
    "createNote",
    // Explicit audit tool
    "logAuditEvent",
  ]);

  useDefaultRenderTool({
    render: ({ name, status, parameters }) => {
      if (ignoredTools.has(name)) return <></>;

      if (status === "complete") {
        logComponentRender(name, (parameters as Record<string, unknown>) ?? {});
      }
      const isComplete = status === "complete";
      return (
        <Marker role="status" variant="border" className="py-1">
          <MarkerIcon>
            {isComplete ? "✓" : <Loader2 className="animate-spin" />}
          </MarkerIcon>
          <MarkerContent className={isComplete ? undefined : "shimmer"}>
            {name}
            {isComplete ? " — done" : " — running…"}
          </MarkerContent>
        </Marker>
      );
    },
  });

  // Register frontend tool hooks
  useSearchContacts();
  useGetContactsByCompany();
  useGetTopLeads();
  useCreateTask();
  useDraftEmail();
  useUpdateRenewalForecast();
  useUpdateContactStatus();
  useAnalyzeContract();
  useListDeals();
  useUpdateDeal();
  useCreateNote();
  useLogAuditEvent();
}
