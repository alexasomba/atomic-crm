import type {
  CreateParams,
  DataProvider,
  DeleteParams,
  GetListParams,
  GetOneParams,
  Identifier,
  UpdateParams,
} from "ra-core";

const apiOrigin = (import.meta.env.VITE_CLOUDFLARE_API_URL ?? "").replace(
  /\/$/,
  "",
);
const resourceUrl = (resource: string, id?: Identifier) =>
  `${apiOrigin}/api/crm/${resource}${id === undefined ? "" : `/${id}`}`;

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
  if (resource !== "contacts") return value;
  return {
    ...value,
    first_name: value.firstName,
    last_name: value.lastName,
    title: value.jobTitle,
    company_id: value.companyId,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
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
  async signUp(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) {
    return request("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        name: `${data.first_name} ${data.last_name}`,
      }),
    });
  },
  async isInitialized() {
    await request<{ ok: boolean }>(`${apiOrigin}/api/health`);
    return true;
  },
  async getConfiguration() {
    const result = await request<{ data: Record<string, unknown> }>(
      `${apiOrigin}/api/configuration`,
    );
    return result.data;
  },
  async updateConfiguration(config: Record<string, unknown>) {
    const result = await request<{ data: Record<string, unknown> }>(
      `${apiOrigin}/api/configuration`,
      { method: "PATCH", body: JSON.stringify(config) },
    );
    return result.data;
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
  signUp: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<unknown>;
  isInitialized: () => Promise<boolean>;
  getConfiguration: () => Promise<Record<string, unknown>>;
  updateConfiguration: (
    config: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  mergeContacts: (
    sourceId: Identifier,
    targetId: Identifier,
  ) => Promise<unknown>;
  unarchiveDeal: (deal: { id: Identifier }) => Promise<unknown>;
};
