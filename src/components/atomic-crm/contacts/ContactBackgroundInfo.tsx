import { useRecordContext, WithRecord } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { DateField } from "@/components/admin/date-field";
import { SaleName } from "../sales/SaleName";
import type { Contact } from "../types";
import { useContactEnrichment } from "../copilot/useContactEnrichment";

export const ContactBackgroundInfo = () => {
  const record = useRecordContext<Contact>();
  const { data: insights } = useContactEnrichment(record?.id);

  if (!record) return null;

  return (
    <div>
      <WithRecord<Contact>
        render={(record) =>
          record?.background ? (
            <div className="pb-2 text-sm">
              <TextField source="background" record={record} />
            </div>
          ) : null
        }
      />
      {insights && (
        <div className="mb-3 space-y-1 text-sm" data-demo="contact-insights">
          {insights.lifecycle_stage && (
            <div>Lifecycle: {insights.lifecycle_stage}</div>
          )}
          <div>Lead score: {insights.lead_score}</div>
          {insights.renewal_forecast_category && (
            <div>
              Forecast: {insights.renewal_forecast_category}
              {insights.renewal_probability != null
                ? ` (${insights.renewal_probability}%)`
                : ""}
            </div>
          )}
          {insights.next_best_action && (
            <div className="text-muted-foreground">
              Next: {insights.next_best_action}
            </div>
          )}
        </div>
      )}
      <div className="text-muted-foreground md:py-0.5">
        <span className="text-sm">Added on</span>{" "}
        <DateField
          source="first_seen"
          options={{ year: "numeric", month: "long", day: "numeric" }}
          className="text-sm"
        />
      </div>

      <div className="text-muted-foreground md:py-0.5">
        <span className="text-sm">Last activity on</span>{" "}
        <DateField
          source="last_seen"
          options={{ year: "numeric", month: "long", day: "numeric" }}
          className="text-sm"
        />
      </div>

      <div className="inline-flex text-muted-foreground text-sm md:py-0.5">
        Followed by&nbsp;
        <ReferenceField source="sales_id" reference="sales">
          <SaleName />
        </ReferenceField>
      </div>
    </div>
  );
};
