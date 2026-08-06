import { createChat } from "@shadcn/helpers/tanstack-ai";

export const deterministicCopilotChat = createChat()
  .user("Triage my top leads.")
  .assistant(({ writer }) => {
    writer.reasoning("Reviewing lead score, activity, and deal signals.");
    writer.text("I found three leads that need attention today.");
  })
  .assistant(({ writer }) => {
    writer
      .tool("getTopLeads", {
        input: { limit: 3 },
      })
      .output({
        leads: [
          { name: "Acme renewal", priority: "high" },
          { name: "Northstar expansion", priority: "high" },
          { name: "Globex follow-up", priority: "medium" },
        ],
      });
    writer.text("The lead priority list is ready.");
  })
  .user("What should I do first?")
  .assistant(
    "Start with the Acme renewal: review the latest activity and schedule a follow-up.",
  );

export function getDeterministicCopilotMessages() {
  return deterministicCopilotChat.get();
}
