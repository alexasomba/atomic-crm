import { useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { ForecastCard } from "./ForecastCard";

export function useUpdateRenewalForecast() {
  useHumanInTheLoop({
    name: "updateRenewalForecast",
    description:
      "Propose a renewal forecast update for a contact. Requires human approval before applying the change.",
    parameters: z.object({
      contactId: z.number().describe("The ID of the contact"),
      contactName: z.string().describe("The name of the contact"),
      currentCategory: z.string().describe("Current renewal forecast category"),
      proposedCategory: z
        .string()
        .describe("Proposed new renewal forecast category"),
      currentProbability: z
        .number()
        .describe("Current renewal probability (0-100)"),
      proposedProbability: z
        .number()
        .describe("Proposed new renewal probability (0-100)"),
      reason: z.string().describe("Reason for the proposed change"),
    }),
    render: ({ args, respond, status }) => (
      <ForecastCard args={args} respond={respond} status={status} />
    ),
  });
}
