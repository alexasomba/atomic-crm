import type { DataProvider, Identifier } from "ra-core";
import type { ConfigurationContextValue } from "../root/ConfigurationContext";
import type { Activity, Sale, SalesFormData, SignUpData } from "../types";
import type { CopilotCrmMethods } from "@/lib/copilotApi";

/** Shared custom surface implemented by FakeRest and Cloudflare. */
export type CrmDataProvider = DataProvider &
  CopilotCrmMethods & {
    signUp(data: SignUpData): Promise<{
      id: Identifier;
      email: string;
      password: string;
    }>;
    salesCreate(data: SalesFormData): Promise<Sale>;
    salesUpdate(
      id: Identifier,
      data: Partial<Omit<SalesFormData, "password">>,
    ): Promise<Sale>;
    updatePassword(id: Identifier): Promise<unknown>;
    getActivityLog(companyId?: Identifier): Promise<Activity[]>;
    isInitialized(): Promise<boolean>;
    getConfiguration(): Promise<ConfigurationContextValue>;
    updateConfiguration(
      config: ConfigurationContextValue,
    ): Promise<ConfigurationContextValue>;
    mergeContacts(sourceId: Identifier, targetId: Identifier): Promise<unknown>;
    unarchiveDeal(deal: { id: Identifier }): Promise<unknown>;
  };
