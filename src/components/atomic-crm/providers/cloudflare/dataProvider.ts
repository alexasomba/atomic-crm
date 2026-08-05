import type {
  CreateParams,
  DataProvider,
  DeleteParams,
  GetListParams,
  GetOneParams,
  Identifier,
  UpdateParams,
} from "ra-core";
import type { Activity, Sale, SalesFormData, SignUpData } from "../../types";
import type { ConfigurationContextValue } from "../../root/ConfigurationContext";
import { getActivityLog } from "../commons/activity";

const apiOrigin = (import.meta.env.VITE_CLOUDFLARE_API_URL ?? "").replace(
  /\/$/,
  "",
);
const resourceUrl = (resource: string, id?: Identifier) =>
  `${apiOrigin}/api/crm/${resource}${id === undefined ? "" : `/${id}`}`;

const toSnakeCase = (key: string) =>
  key.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);

const request = async <T>(input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: unknown;
  };
  if (!response.ok) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : `Request failed (${response.status})`,
    );
  }
  return body;
};

const fromApiRecord = (resource: string, value: Record<string, unknown>) => {
  const record = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [toSnakeCase(key), entry]),
  );
  if (resource !== "contacts") return record;
  return {
    ...record,
    first_name: record.first_name,
    last_name: record.last_name,
    title: record.job_title,
    company_id: record.company_id,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
};

const toApiRecord = (resource: string, value: Record<string, unknown>) => {
  if (resource !== "contacts") return value;
  return {
    ...value,
    first_name: value.first_name,
    last_name: value.last_name,
    job_title: value.title,
    company_id: value.company_id,
  };
};

const getList = async (resource: string, params: GetListParams) => {
  const search = new URLSearchParams({
    page: String(params.pagination?.page ?? 1),
    perPage: String(params.pagination?.perPage ?? 25),
  });
  const query = params.filter?.q;
  if (typeof query === "string" && query.length > 0) search.set("q", query);
  const result = await request<{
    data: Record<string, unknown>[];
    total: number;
  }>(`${resourceUrl(resource)}?${search}`);
  return {
    data: result.data.map((record) => fromApiRecord(resource, record)),
    total: result.total,
  };
};

const implementation = {
  getList,
  async getOne(resource: string, params: GetOneParams) {
    const result = await request<{ data: Record<string, unknown> }>(
      resourceUrl(resource, params.id),
    );
    return { data: fromApiRecord(resource, result.data) };
  },
  async getMany(resource: string, params: { ids: Identifier[] }) {
    const values = await Promise.all(
      params.ids.map((id) => this.getOne(resource, { id })),
    );
    return { data: values.map(({ data }) => data) };
  },
  async getManyReference(
    resource: string,
    params: GetListParams & { target: string; id: Identifier },
  ) {
    return getList(resource, {
      ...params,
      filter: { ...params.filter, [params.target]: params.id },
    });
  },
  async create(resource: string, params: CreateParams) {
    const result = await request<{ data: Record<string, unknown> }>(
      resourceUrl(resource),
      {
        method: "POST",
        body: JSON.stringify(toApiRecord(resource, params.data)),
      },
    );
    return { data: fromApiRecord(resource, result.data) };
  },
  async update(resource: string, params: UpdateParams) {
    const result = await request<{ data: Record<string, unknown> }>(
      resourceUrl(resource, params.id),
      {
        method: "PATCH",
        body: JSON.stringify(toApiRecord(resource, params.data)),
      },
    );
    return { data: fromApiRecord(resource, result.data) };
  },
  async updateMany(
    resource: string,
    params: { ids: Identifier[]; data: Record<string, unknown> },
  ) {
    const values = await Promise.all(
      params.ids.map((id) =>
        this.update(resource, { id, data: params.data, previousData: {} }),
      ),
    );
    return { data: values.map(({ data }) => data.id) };
  },
  async delete(resource: string, params: DeleteParams) {
    const result = await request<{ data: Record<string, unknown> }>(
      resourceUrl(resource, params.id),
      { method: "DELETE" },
    );
    return { data: fromApiRecord(resource, result.data) };
  },
  async deleteMany(resource: string, params: { ids: Identifier[] }) {
    await Promise.all(
      params.ids.map((id) =>
        this.delete(resource, { id, previousData: {} as never }),
      ),
    );
    return { data: params.ids };
  },
  async signUp(data: SignUpData) {
    const result = await request<{ user?: { id: string } }>(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: `${data.first_name} ${data.last_name}`,
        }),
      },
    );
    if (!result.user?.id) throw new Error("Account creation failed");
    return { id: result.user.id, email: data.email, password: data.password };
  },
  async salesCreate(data: SalesFormData) {
    const result = await request<{ data: Sale }>(`${apiOrigin}/api/crm/sales`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result.data;
  },
  async salesUpdate(
    id: Identifier,
    data: Partial<Omit<SalesFormData, "password">>,
  ) {
    const result = await request<{ data: Sale }>(
      `${apiOrigin}/api/crm/sales/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    return result.data;
  },
  async updatePassword(_id: Identifier) {
    const identity = await request<{ data: { email: string } }>(
      `${apiOrigin}/api/me`,
    );
    await request(`${apiOrigin}/api/auth/request-password-reset`, {
      method: "POST",
      body: JSON.stringify({
        email: identity.data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    });
    return true as const;
  },
  async getActivityLog(companyId?: Identifier): Promise<Activity[]> {
    return getActivityLog(implementation as DataProvider, companyId);
  },
  async isInitialized() {
    await request<{ ok: boolean }>(`${apiOrigin}/api/health`);
    return true;
  },
  async getConfiguration(): Promise<ConfigurationContextValue> {
    const result = await request<{ data: Record<string, unknown> }>(
      `${apiOrigin}/api/configuration`,
    );
    return result.data as unknown as ConfigurationContextValue;
  },
  async updateConfiguration(config: ConfigurationContextValue) {
    const result = await request<{ data: Record<string, unknown> }>(
      `${apiOrigin}/api/configuration`,
      { method: "PATCH", body: JSON.stringify(config) },
    );
    return result.data as unknown as ConfigurationContextValue;
  },
  async mergeContacts(sourceId: Identifier, targetId: Identifier) {
    const result = await request<{ data: unknown }>(
      `${apiOrigin}/api/crm/contacts/merge`,
      {
        method: "POST",
        body: JSON.stringify({ sourceId, targetId }),
      },
    );
    return result.data;
  },
  async unarchiveDeal(deal: { id: Identifier }) {
    const result = await request<{ data: unknown }>(
      `${apiOrigin}/api/crm/deals/${deal.id}/unarchive`,
      { method: "POST", body: "{}" },
    );
    return result.data;
  },
};

export const dataProvider = implementation as DataProvider & {
  signUp: (data: SignUpData) => Promise<{
    id: Identifier;
    email: string;
    password: string;
  }>;
  salesCreate: (data: SalesFormData) => Promise<Sale>;
  salesUpdate: (
    id: Identifier,
    data: Partial<Omit<SalesFormData, "password">>,
  ) => Promise<Sale>;
  updatePassword: (id: Identifier) => Promise<true>;
  getActivityLog: (companyId?: Identifier) => Promise<Activity[]>;
  isInitialized: () => Promise<boolean>;
  getConfiguration: () => Promise<ConfigurationContextValue>;
  updateConfiguration: (
    config: ConfigurationContextValue,
  ) => Promise<ConfigurationContextValue>;
  mergeContacts: (
    sourceId: Identifier,
    targetId: Identifier,
  ) => Promise<unknown>;
  unarchiveDeal: (deal: { id: Identifier }) => Promise<unknown>;
};
