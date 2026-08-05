import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputDirectory = process.env.MIGRATION_OUTPUT ?? "migration-data";
const exportPath = `${outputDirectory}/supabase-export.json`;
const sqlPath = `${outputDirectory}/d1-import.sql`;
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

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(exportPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${exportPath}`);
}

const sourceValue = (row, ...names) =>
  names.map((name) => row[name]).find((value) => value !== undefined);
const jsonValue = (value) =>
  value === undefined || value === null ? "[]" : value;

const rowMappings = {
  companies: {
    table: "companies",
    columns: ["id", "name", "sector", "created_at", "updated_at"],
    values: (row) => [
      sourceValue(row, "id"),
      sourceValue(row, "name"),
      sourceValue(row, "sector"),
      sourceValue(row, "created_at") ?? new Date().toISOString(),
      sourceValue(row, "updated_at") ?? new Date().toISOString(),
    ],
  },
  contacts: {
    table: "contacts",
    columns: [
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "job_title",
      "company_id",
      "tags",
      "created_at",
      "updated_at",
    ],
    values: (row) => [
      sourceValue(row, "id"),
      sourceValue(row, "first_name") ?? "Unknown",
      sourceValue(row, "last_name") ?? "Contact",
      sourceValue(row, "email"),
      sourceValue(row, "phone") ?? sourceValue(row, "phone_number"),
      sourceValue(row, "title", "job_title"),
      sourceValue(row, "company_id"),
      jsonValue(sourceValue(row, "tags")),
      sourceValue(row, "first_seen", "created_at") ?? new Date().toISOString(),
      sourceValue(row, "last_seen", "updated_at") ?? new Date().toISOString(),
    ],
  },
  sales: {
    table: "sales",
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
    ],
    values: (row) => [
      sourceValue(row, "id"),
      sourceValue(row, "user_id"),
      sourceValue(row, "first_name") ?? "Unknown",
      sourceValue(row, "last_name") ?? "User",
      sourceValue(row, "email"),
      row.administrator ? "admin" : "user",
      sourceValue(row, "disabled") ?? false,
      sourceValue(row, "created_at") ?? new Date().toISOString(),
      sourceValue(row, "updated_at") ?? new Date().toISOString(),
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
        `INSERT OR REPLACE INTO ${mapping.table} (${mapping.columns.join(", ")}) VALUES (${values});`,
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
  for (const [sourceTable, mapping] of Object.entries(rowMappings)) {
    const expected = input.tables?.[sourceTable]?.length ?? 0;
    const { stdout } = await execFileAsync(
      "wrangler",
      [
        "d1",
        "execute",
        "atomic-crm-db",
        `--${target}`,
        "--json",
        "--command",
        `SELECT COUNT(*) AS count FROM ${mapping.table}`,
        "--config",
        "wrangler.jsonc",
      ],
      { maxBuffer: 2 * 1024 * 1024 },
    );
    const result = JSON.parse(stdout.slice(stdout.indexOf("[")));
    const actual = Number(result[0]?.results?.[0]?.count ?? 0);
    const marker = actual === expected ? "OK" : "DIFF";
    if (marker === "DIFF") differences += 1;
    console.log(
      `${marker} ${mapping.table}: exported=${expected} d1=${actual}`,
    );
  }
  if (differences > 0) process.exitCode = 1;
  else console.log("Reconciliation passed for mapped table counts.");
} else {
  throw new Error(
    `Unknown command: ${command}. Use export, import, or reconcile.`,
  );
}
