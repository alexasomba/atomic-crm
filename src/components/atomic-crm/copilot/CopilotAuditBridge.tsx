import { useEffect } from "react";
import { useDataProvider } from "ra-core";
import { configureCopilotAudit } from "./tools/auditLogger";
import type { CrmDataProvider } from "../providers/types";

export function CopilotAuditBridge() {
  const dataProvider = useDataProvider<CrmDataProvider>();

  useEffect(() => {
    configureCopilotAudit((event) => dataProvider.logCopilotAudit(event));
    return () => configureCopilotAudit(async () => {});
  }, [dataProvider]);

  return null;
}
