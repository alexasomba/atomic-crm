import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputDirectory = process.env.MIGRATION_OUTPUT ?? "migration-data";
const exportPath = `${outputDirectory}/supabase-export.json`;
const sqlPath = `${outputDirectory}/d1-import.sql`;
const storageDirectory = `${outputDirectory}/storage/attachments`;
const storageManifestPath = `${outputDirectory}/storage-manifest.json`;
const pageSize = 1_000;

const tables = [
  "companies",
  "contacts",
  "sales",
  "tasks",
  "deals",
  "contact_notes",
  "deal_notes",
  "tags",
  "configuration",
];

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const escapeSql = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return `'${String(typeof value === "object" ? JSON.stringify(value) : value).replaceAll("'", "''")}'`;
};

async function exportSupabase() {
  const supabase = createClient(
    required("VITE_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const data = { exportedAt: new Date().toISOString(), tables: {} };

  for (const table of tables) {
    const rows = [];
    for (let from = 0; ; from += pageSize) {
      const { data: page, error } = await supabase
        .from(table)
        .select("*")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...(page ?? []));
      if (!page || page.length < pageSize) break;
    }
    data.tables[table] = rows;
    console.log(`${table}: ${rows.length} rows`);
  }

  const authUsers = [];
  for (let page = 1; ; page += 1) {
    const { data: result, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });
    if (error) throw new Error(`auth.users: ${error.message}`);
    for (const user of result.users ?? []) {
      authUsers.push({
        id: user.id,
        email: user.email,
        emailConfirmedAt: user.email_confirmed_at,
        phone: user.phone,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastSignInAt: user.last_sign_in_at,
        appMetadata: user.app_metadata,
        userMetadata: user.user_metadata,
      });
    }
    if (!result.users || result.users.length < pageSize) break;
  }
  data.authUsers = authUsers;
  console.log(
    `auth.users: ${authUsers.length} metadata records (password hashes are intentionally not exported)`,
  );

  await mkdir(outputDirectory, { recursive: true });
  if (process.env.MIGRATION_SKIP_STORAGE !== "1") {
    const manifest = await exportStorage(supabase);
    await writeFile(
      storageManifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    console.log(
      `storage.objects: ${manifest.length} files; wrote ${storageManifestPath}`,
    );
  }

  await writeFile(exportPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${exportPath}`);
}

async function exportStorage(supabase) {
  const manifest = [];
  const pending = [""];
  while (pending.length > 0) {
    const prefix = pending.shift();
    for (let offset = 0; ; offset += pageSize) {
      const { data: entries, error } = await supabase.storage
        .from("attachments")
        .list(prefix, { limit: pageSize, offset });
      if (error)
        throw new Error(`storage.attachments/${prefix}: ${error.message}`);
      for (const entry of entries ?? []) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id === null) {
          pending.push(path);
          continue;
        }
        const { data: file, error: downloadError } = await supabase.storage
          .from("attachments")
          .download(path);
        if (downloadError)
          throw new Error(
            `storage.attachments/${path}: ${downloadError.message}`,
          );
        const bytes = new Uint8Array(await file.arrayBuffer());
        const destination = `${storageDirectory}/${path}`;
        await mkdir(destination.slice(0, destination.lastIndexOf("/")), {
          recursive: true,
        });
        await writeFile(destination, bytes);
        manifest.push({
          path,
          size: bytes.byteLength,
          contentType: entry.metadata?.mimetype ?? "application/octet-stream",
          updatedAt: entry.updated_at ?? null,
          etag: entry.etag ?? null,
        });
      }
      if (!entries || entries.length < pageSize) break;
    }
  }
  return manifest;
}

const sourceValue = (row, ...names) =>
  names.map((name) => row[name]).find((value) => value !== undefined);
const jsonValue = (value, fallback = []) =>
  value === undefined || value === null ? fallback : value;
const isoNow = () => new Date().toISOString();
const sourceDate = (row, ...names) => sourceValue(row, ...names) ?? isoNow();

const rowMappings = {
  companies: {
    targetTable: "companies",
    columns: [
      "id",
      "name",
      "sector",
      "size",
      "linkedin_url",
      "website",
      "phone_number",
      "address",
      "zipcode",
      "city",
      "state_abbr",
      "sales_id",
      "context_links",
      "country",
      "description",
      "revenue",
      "tax_identifier",
      "logo",
      "created_at",
      "updated_at",
    ],
    values: (row) => [
      sourceValue(row, "id"),
      sourceValue(row, "name"),
      sourceValue(row, "sector"),
      sourceValue(row, "size"),
      sourceValue(row, "linkedin_url"),
      sourceValue(row, "website"),
      sourceValue(row, "phone_number"),
      sourceValue(row, "address"),
      sourceValue(row, "zipcode"),
      sourceValue(row, "city"),
      sourceValue(row, "state_abbr", "stateAbbr"),
      sourceValue(row, "sales_id"),
      jsonValue(sourceValue(row, "context_links"), null),
      sourceValue(row, "country"),
      sourceValue(row, "description"),
      sourceValue(row, "revenue"),
      sourceValue(row, "tax_identifier"),
      jsonValue(sourceValue(row, "logo"), null),
      sourceDate(row, "created_at"),
      sourceDate(row, "updated_at", "created_at"),
    ],
  },
  contacts: {
    targetTable: "contacts",
    columns: [
      "id",
      "first_name",
      "last_name",
      "email",
      "email_json",
      "phone",
      "phone_json",
      "phone_1_number",
      "phone_1_type",
      "phone_2_number",
      "phone_2_type",
      "job_title",
      "gender",
      "background",
      "acquisition",
      "avatar",
      "first_seen",
      "last_seen",
      "has_newsletter",
      "status",
      "company_id",
      "sales_id",
      "linkedin_url",
      "tags",
      "created_at",
      "updated_at",
    ],
    values: (row) => [
      sourceValue(row, "id"),
      sourceValue(row, "first_name") ?? "Unknown",
      sourceValue(row, "last_name") ?? "Contact",
      sourceValue(row, "email") ??
        (Array.isArray(row.email_jsonb) ? row.email_jsonb[0]?.email : null),
      jsonValue(sourceValue(row, "email_jsonb"), null),
      sourceValue(row, "phone") ??
        (Array.isArray(row.phone_jsonb) ? row.phone_jsonb[0]?.number : null),
      jsonValue(sourceValue(row, "phone_jsonb"), null),
      sourceValue(row, "phone_1_number"),
      sourceValue(row, "phone_1_type"),
      sourceValue(row, "phone_2_number"),
      sourceValue(row, "phone_2_type"),
      sourceValue(row, "title", "job_title"),
      sourceValue(row, "gender"),
      sourceValue(row, "background"),
      sourceValue(row, "acquisition"),
      jsonValue(sourceValue(row, "avatar"), null),
      sourceDate(row, "first_seen", "created_at"),
      sourceDate(row, "last_seen", "updated_at"),
      sourceValue(row, "has_newsletter"),
      sourceValue(row, "status"),
      sourceValue(row, "company_id"),
      sourceValue(row, "sales_id"),
      sourceValue(row, "linkedin_url"),
      jsonValue(sourceValue(row, "tags")),
      sourceDate(row, "created_at", "first_seen"),
      sourceDate(row, "updated_at", "last_seen"),
    ],
  },
  sales: {
    targetTable: "sales",
    columns: [
      "id",
      "user_id",
      "first_name",
      "last_name",
      "email",
      "role",
      "disabled",
      "created_at",
      "updated_at",
      "avatar",
    ],
    values: (row) => [
      sourceValue(row, "id"),
      sourceValue(row, "user_id"),
      sourceValue(row, "first_name") ?? "Unknown",
      sourceValue(row, "last_name") ?? "User",
      sourceValue(row, "email"),
      row.administrator ? "admin" : "user",
      sourceValue(row, "disabled") ?? false,
      sourceDate(row, "created_at"),
      sourceDate(row, "updated_at", "created_at"),
      jsonValue(sourceValue(row, "avatar"), null),
    ],
  },
  tasks: {
    targetTable: "tasks",
    columns: [
      "id",
      "contact_id",
      "company_id",
      "sales_id",
      "title",
      "description",
      "type",
      "text",
      "status",
      "due_date",
      "done_date",
      "created_at",
      "updated_at",
    ],
    values: (row) => [
      sourceValue(row, "id"),
      sourceValue(row, "contact_id"),
      sourceValue(row, "company_id"),
      sourceValue(row, "sales_id"),
      sourceValue(row, "text", "type") ?? "Task",
      sourceValue(row, "text"),
      sourceValue(row, "type"),
      sourceValue(row, "text"),
      sourceValue(row, "done_date") ? "done" : "pending",
      sourceValue(row, "due_date"),
      sourceValue(row, "done_date"),
      sourceDate(row, "created_at", "due_date"),
      sourceDate(row, "updated_at", "created_at", "due_date"),
    ],
  },
  deals: {
    targetTable: "deals",
    columns: [
      "id",
      "contact_id",
      "company_id",
      "contact_ids",
      "sales_id",
      "name",
      "category",
      "description",
      "amount",
      "stage",
      "status",
      "archived_at",
      "position",
      "expected_closing_date",
      "metadata",
      "created_at",
      "updated_at",
    ],
    values: (row) => {
      const contactIds = Array.isArray(row.contact_ids) ? row.contact_ids : [];
      return [
        sourceValue(row, "id"),
        contactIds[0] ?? null,
        sourceValue(row, "company_id"),
        jsonValue(contactIds),
        sourceValue(row, "sales_id"),
        sourceValue(row, "name") ?? "Deal",
        sourceValue(row, "category"),
        sourceValue(row, "description"),
        sourceValue(row, "amount"),
        sourceValue(row, "stage") ?? "default",
        sourceValue(row, "archived_at") ? "archived" : "open",
        sourceValue(row, "archived_at"),
        sourceValue(row, "index") ?? 0,
        sourceValue(row, "expected_closing_date"),
        jsonValue(sourceValue(row, "metadata"), {}),
        sourceDate(row, "created_at"),
        sourceDate(row, "updated_at", "created_at"),
      ];
    },
  },
  contact_notes: {
    targetTable: "notes",
    columns: [
      "id",
      "contact_id",
      "deal_id",
      "sales_id",
      "title",
      "content",
      "source",
      "status",
      "attachments",
      "created_at",
      "updated_at",
    ],
    values: (row) => [
      sourceValue(row, "id"),
      sourceValue(row, "contact_id"),
      null,
      sourceValue(row, "sales_id"),
      "Contact note",
      sourceValue(row, "text") ?? "",
      "manual",
      sourceValue(row, "status"),
      jsonValue(sourceValue(row, "attachments"), null),
      sourceDate(row, "date"),
      sourceDate(row, "date"),
    ],
  },
  deal_notes: {
    targetTable: "notes",
    columns: [
      "id",
      "contact_id",
      "deal_id",
      "sales_id",
      "title",
      "content",
      "source",
      "status",
      "attachments",
      "created_at",
      "updated_at",
    ],
    values: (row) => [
      Number(sourceValue(row, "id")) + 1_000_000_000,
      null,
      sourceValue(row, "deal_id"),
      sourceValue(row, "sales_id"),
      sourceValue(row, "type") ?? "Deal note",
      sourceValue(row, "text") ?? "",
      "manual",
      null,
      jsonValue(sourceValue(row, "attachments"), null),
      sourceDate(row, "date"),
      sourceDate(row, "date"),
    ],
  },
  tags: {
    targetTable: "tags",
    columns: ["id", "name", "color"],
    values: (row) => [
      sourceValue(row, "id"),
      sourceValue(row, "name") ?? "Tag",
      sourceValue(row, "color") ?? "#64748b",
    ],
  },
  configuration: {
    targetTable: "configuration",
    columns: ["key", "value", "updated_at"],
    values: (row) => [
      "crm",
      sourceValue(row, "config") ?? {},
      sourceDate(row, "updated_at"),
    ],
  },
};

async function generateImport() {
  const input = JSON.parse(
    await readFile(process.env.MIGRATION_EXPORT ?? exportPath, "utf8"),
  );
  const statements = ["PRAGMA foreign_keys = OFF;"];
  for (const [sourceTable, mapping] of Object.entries(rowMappings)) {
    for (const row of input.tables?.[sourceTable] ?? []) {
      const values = mapping.values(row).map(escapeSql).join(", ");
      statements.push(
        `INSERT OR REPLACE INTO ${mapping.targetTable} (${mapping.columns.join(", ")}) VALUES (${values});`,
      );
    }
  }
  statements.push("PRAGMA foreign_keys = ON;");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(sqlPath, `${statements.join("\n")}\n`);
  console.log(`Wrote ${sqlPath}`);

  if (process.env.MIGRATION_APPLY !== "1") {
    console.log(
      "Dry run only. Set MIGRATION_APPLY=1 to apply this file locally.",
    );
    return;
  }
  const target = process.env.MIGRATION_TARGET ?? "local";
  await execFileAsync(
    "wrangler",
    [
      "d1",
      "execute",
      "atomic-crm-db",
      `--${target}`,
      "--file",
      sqlPath,
      "--config",
      "wrangler.jsonc",
    ],
    { stdio: "inherit" },
  );
}

const command = process.argv[2] ?? "export";
if (command === "export") await exportSupabase();
else if (command === "import") await generateImport();
else if (command === "reconcile") {
  const input = JSON.parse(
    await readFile(process.env.MIGRATION_EXPORT ?? exportPath, "utf8"),
  );
  let differences = 0;
  const target = process.env.MIGRATION_TARGET ?? "local";
  const expectedByTarget = new Map();
  for (const [sourceTable, mapping] of Object.entries(rowMappings)) {
    expectedByTarget.set(
      mapping.targetTable,
      (expectedByTarget.get(mapping.targetTable) ?? 0) +
        (input.tables?.[sourceTable]?.length ?? 0),
    );
  }
  for (const [targetTable, expected] of expectedByTarget) {
    const { stdout } = await execFileAsync(
      "wrangler",
      [
        "d1",
        "execute",
        "atomic-crm-db",
        `--${target}`,
        "--json",
        "--command",
        `SELECT COUNT(*) AS count FROM ${targetTable}`,
        "--config",
        "wrangler.jsonc",
      ],
      { maxBuffer: 2 * 1024 * 1024 },
    );
    const result = JSON.parse(stdout.slice(stdout.indexOf("[")));
    const actual = Number(result[0]?.results?.[0]?.count ?? 0);
    const marker = actual === expected ? "OK" : "DIFF";
    if (marker === "DIFF") differences += 1;
    console.log(`${marker} ${targetTable}: exported=${expected} d1=${actual}`);
  }
  if (differences > 0) process.exitCode = 1;
  else console.log("Reconciliation passed for mapped table counts.");
} else {
  throw new Error(
    `Unknown command: ${command}. Use export, import, or reconcile.`,
  );
}
