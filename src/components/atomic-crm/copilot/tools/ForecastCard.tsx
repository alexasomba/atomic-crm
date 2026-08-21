import { useEffect, useRef } from "react";
import { useDataProvider, useGetIdentity } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logToolCall } from "./auditLogger";
import type { CrmDataProvider } from "../../providers/types";

export interface ForecastCardProps {
  args: Partial<{
    contactId: number;
    contactName: string;
    currentCategory: string;
    proposedCategory: string;
    currentProbability: number;
    proposedProbability: number;
    reason: string;
  }>;
  respond: ((response: unknown) => void) | undefined;
  status: string;
}

export function ForecastCard({
  args,
  respond,
  status: _status,
}: ForecastCardProps) {
  const { data: identity } = useGetIdentity({ staleTime: 0 });
  const dataProvider = useDataProvider<CrmDataProvider>();
  const isAdmin = !!(identity as { administrator?: boolean })?.administrator;

  const hasAutoResponded = useRef(false);

  // Non-admin: auto-respond after 2s delay so the user can read the proposal
  useEffect(() => {
    if (isAdmin || !respond || hasAutoResponded.current) return;

    const timer = setTimeout(() => {
      hasAutoResponded.current = true;
      respond({ approved: false, reason: "insufficient_role" });
      logToolCall("updateRenewalForecast", {
        contactName: args.contactName,
        summary: `Forecast proposal shown to non-admin user (approval requires admin role)`,
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAdmin, respond, args.contactName]);

  const isExecuting = !!respond;

  return (
    <Card className="my-2" data-demo="hitl-card">
      <CardContent className="pt-4">
        <div className="mb-3">
          <p className="font-semibold text-sm mb-1">
            Renewal Forecast Update — {args.contactName}
          </p>
          <p className="text-xs text-muted-foreground mb-2">{args.reason}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted rounded p-2">
              <p className="font-medium text-muted-foreground">Current</p>
              <p>{args.currentCategory}</p>
              <p>{args.currentProbability}%</p>
            </div>
            <div className="bg-muted rounded p-2">
              <p className="font-medium text-muted-foreground">Proposed</p>
              <p>{args.proposedCategory}</p>
              <p>{args.proposedProbability}%</p>
            </div>
          </div>
        </div>
        {isAdmin && isExecuting && respond && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                if (args.contactId == null) return;
                await dataProvider.updateRenewalForecast(args.contactId, {
                  renewal_forecast_category: args.proposedCategory,
                  renewal_probability: args.proposedProbability,
                });
                respond({ approved: true });
                logToolCall("updateRenewalForecast", {
                  contactName: args.contactName,
                  summary: `Approved renewal forecast for ${args.contactName}: ${args.currentCategory} → ${args.proposedCategory}`,
                });
              }}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                respond({ approved: false });
                logToolCall("updateRenewalForecast", {
                  contactName: args.contactName,
                  summary: `Rejected renewal forecast for ${args.contactName}`,
                });
              }}
            >
              Reject
            </Button>
          </div>
        )}
        {!isAdmin && (
          <p className="text-xs text-muted-foreground mt-2">
            Only admins can approve forecast changes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
