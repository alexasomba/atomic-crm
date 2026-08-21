import Papa from "papaparse";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const stagingDatabase = "atomic-crm-staging-db";
const stagingConfig = "wrangler.staging.jsonc";
const csvPath = process.env.STAGING_FIXTURE ?? "test-data/contacts_demo_v2.csv";
const outputDirectory = process.env.STAGING_SEED_OUTPUT ?? "migration-data";
const outputPath = `${outputDirectory}/staging-demo-seed.sql`;

const hasFlag = (flag) => process.argv.includes(flag);
const sql = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return `'${String(
    typeof value === "object" ? JSON.stringify(value) : value,
  ).replaceAll("'", "''")}'`;
};

const iso = (value) =>
  value || new Date("2026-01-01T00:00:00.000Z").toISOString();
const number = (value, fallback = 0) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
};

const insert = (table, columns, values) =>
  `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${values
    .map(sql)
    .join(", ")});`;

const companySlug = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const truthy = (value) => value === "True" || value === "true" || value === "1";
const money = (value) => {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

const expectedCounts = (rows, testEmail, contracts) => {
  const companies = new Set(
    rows.map((row) => number(row.company_id, 0)).filter(Boolean),
  );
  const sales = new Set(rows.map((row) => number(row.sales_id, 0)));
  sales.add(0);
  const tags = new Set(
    rows.flatMap((row) =>
      (row.tags ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
  const tasks = rows
    .slice(0, 50)
    .reduce(
      (total, row) => total + Math.min(Math.max(number(row.nb_tasks, 1), 1), 3),
      0,
    );
  const contractNotes = new Set(
    rows
      .map((row) => companySlug(row.company_name || row.company || ""))
      .filter((slug) => contracts.has(slug)),
  );
  return {
    companies: companies.size,
    contacts: rows.length + (testEmail ? 1 : 0),
    sales: sales.size,
    tasks,
    deals: companies.size,
    notes: Math.min(rows.length, 20) + contractNotes.size,
    tags: tags.size,
    configuration: 1,
    contact_insights: rows.length + (testEmail ? 1 : 0),
  };
};

function buildSeedSql(rows, testEmail, contracts) {
  const now = "2026-01-01T00:00:00.000Z";
  const companyMap = new Map();
  const salesIds = new Set([0]);
  const contactsByCompany = new Map();
  const tags = new Map();

  for (const row of rows) {
    const companyId = number(row.company_id, 0);
    if (companyId && !companyMap.has(companyId)) {
      companyMap.set(companyId, {
        id: companyId,
        name: row.company_name || row.company || `Demo Company ${companyId}`,
      });
    }
    const salesId = number(row.sales_id, 0);
    salesIds.add(salesId);
    if (companyId) {
      const companyContacts = contactsByCompany.get(companyId) ?? [];
      companyContacts.push(number(row.id));
      contactsByCompany.set(companyId, companyContacts);
    }
    for (const tag of (row.tags ?? "")
      .split(",")
      .map((value) => value.trim())) {
      if (tag && !tags.has(tag)) tags.set(tag, tags.size + 1);
    }
  }

  const statements = [
    "PRAGMA foreign_keys = OFF;",
    ...(hasFlag("--reset")
      ? [
          "DELETE FROM inbound_email_events;",
          "DELETE FROM copilot_audit;",
          "DELETE FROM contact_insights;",
          "DELETE FROM attachments;",
          "DELETE FROM activities;",
          "DELETE FROM notes;",
          "DELETE FROM tasks;",
          "DELETE FROM deals;",
          "DELETE FROM contacts;",
          "DELETE FROM companies;",
          "DELETE FROM tags;",
          "DELETE FROM configuration;",
          "DELETE FROM sales;",
        ]
      : []),
  ];

  for (const id of [...salesIds].sort((a, b) => a - b)) {
    statements.push(
      insert(
        "sales",
        [
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
        [
          id,
          null,
          id === 0 ? "Jane" : "Demo",
          id === 0 ? "Doe" : `Sales ${id}`,
          id === 0
            ? "demo-admin@atomic-crm.asomba.com"
            : `demo-sales-${id}@atomic-crm.asomba.com`,
          id === 0 ? "admin" : "user",
          false,
          now,
          now,
        ],
      ),
    );
  }

  for (const company of companyMap.values()) {
    statements.push(
      insert(
        "companies",
        [
          "id",
          "name",
          "sector",
          "size",
          "linkedin_url",
          "website",
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
        [
          company.id,
          company.name,
          "information-technology",
          50,
          null,
          null,
          0,
          [],
          "USA",
          "Deterministic staging demo company",
          "$10M",
          `DEMO-${company.id}`,
          null,
          now,
          now,
        ],
      ),
    );
  }

  for (const row of rows) {
    const emails = [row.email_work, row.email_home, row.email_other]
      .filter(Boolean)
      .map((email, index) => ({
        email,
        type: ["Work", "Home", "Other"][index],
      }));
    const phones = [row.phone_work, row.phone_home, row.phone_other]
      .filter(Boolean)
      .map((phone, index) => ({
        number: phone,
        type: ["Work", "Home", "Other"][index],
      }));
    const companyId = number(row.company_id, 0) || null;
    const contactId = number(row.id);
    statements.push(
      insert(
        "contacts",
        [
          "id",
          "first_name",
          "last_name",
          "email",
          "email_json",
          "phone",
          "phone_json",
          "job_title",
          "gender",
          "background",
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
        [
          contactId,
          row.first_name || "Demo",
          row.last_name || "Contact",
          emails[0]?.email ?? null,
          emails,
          phones[0]?.number ?? null,
          phones,
          row.title || null,
          row.gender || null,
          row.background || null,
          iso(row.first_seen),
          iso(row.last_seen),
          row.has_newsletter === "True",
          row.status || "cold",
          companyId,
          number(row.sales_id, 0),
          row.linkedin_url || null,
          (row.tags ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          iso(row.first_seen),
          iso(row.last_seen),
        ],
      ),
    );
  }

  if (testEmail) {
    const firstCompany = companyMap.values().next().value;
    statements.push(
      insert(
        "contacts",
        [
          "id",
          "first_name",
          "last_name",
          "email",
          "email_json",
          "status",
          "company_id",
          "sales_id",
          "tags",
          "created_at",
          "updated_at",
        ],
        [
          900000,
          "Staging",
          "Inbound Test",
          testEmail,
          [{ email: testEmail, type: "Work" }],
          "warm",
          firstCompany?.id ?? null,
          0,
          ["staging"],
          now,
          now,
        ],
      ),
    );
  }

  for (const row of rows) {
    const contactId = number(row.id);
    statements.push(
      insert(
        "contact_insights",
        [
          "contact_id",
          "lifecycle_stage",
          "lead_score",
          "last_activity_date",
          "last_activity_type",
          "renewal_amount",
          "renewal_date",
          "renewal_forecast_category",
          "renewal_probability",
          "contract_attachment_id",
          "economic_buyer_identified",
          "budget_confirmed",
          "legal_review_status",
          "security_review_status",
          "champion_confidence",
          "competitor",
          "next_best_action",
          "notes_summary",
          "updated_at",
        ],
        [
          contactId,
          row.lifecycle_stage || null,
          number(row.lead_score, 0),
          row.last_activity_date || null,
          row.last_activity_type || null,
          money(row.renewal_amount),
          row.renewal_date || null,
          row.renewal_forecast_category || null,
          money(row.renewal_probability),
          null,
          truthy(row.economic_buyer_identified),
          truthy(row.budget_confirmed),
          row.legal_review_status || null,
          row.security_review_status || null,
          row.champion_confidence || null,
          row.competitor || null,
          row.next_best_action || null,
          row.notes_summary || null,
          iso(row.last_seen),
        ],
      ),
    );
  }

  if (testEmail) {
    statements.push(
      insert(
        "contact_insights",
        ["contact_id", "lead_score", "updated_at"],
        [900000, 0, now],
      ),
    );
  }

  // Tag IDs 1-100 are reserved for this deterministic fixture. Removing this
  // range makes rerunning the seed converge after older fixture revisions.
  statements.push("DELETE FROM tags WHERE id BETWEEN 1 AND 100;");
  for (const [name, id] of tags) {
    statements.push(
      insert("tags", ["id", "name", "color"], [id, name, "#64748b"]),
    );
  }

  let taskId = 900000;
  for (const row of rows.slice(0, 50)) {
    const count = Math.min(Math.max(number(row.nb_tasks, 1), 1), 3);
    for (let index = 0; index < count; index += 1) {
      statements.push(
        insert(
          "tasks",
          [
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
          [
            taskId++,
            number(row.id),
            number(row.company_id, 0) || null,
            number(row.sales_id, 0),
            `Demo task ${index + 1}`,
            row.next_best_action || "Follow up with contact",
            "follow-up",
            row.next_best_action || "Follow up with contact",
            "pending",
            row.renewal_date || "2026-12-31",
            null,
            now,
            now,
          ],
        ),
      );
    }
  }

  let dealId = 900000;
  for (const company of companyMap.values()) {
    const contactId = contactsByCompany.get(company.id)?.[0] ?? null;
    statements.push(
      insert(
        "deals",
        [
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
          "position",
          "expected_closing_date",
          "metadata",
          "created_at",
          "updated_at",
        ],
        [
          dealId++,
          contactId,
          company.id,
          contactId ? [contactId] : [],
          0,
          `${company.name} demo opportunity`,
          "other",
          "Deterministic staging demo deal",
          10000,
          "opportunity",
          "open",
          0,
          "2026-12-31",
          { source: "staging-demo-seed" },
          now,
          now,
        ],
      ),
    );
  }

  for (const row of rows.slice(0, 20)) {
    statements.push(
      insert(
        "notes",
        [
          "id",
          "contact_id",
          "sales_id",
          "title",
          "content",
          "source",
          "status",
          "attachments",
          "created_at",
          "updated_at",
        ],
        [
          900000 + number(row.id),
          number(row.id),
          number(row.sales_id, 0),
          "Demo note",
          row.notes_summary || "Deterministic staging demo note",
          "manual",
          row.status || "warm",
          [],
          iso(row.last_seen),
          iso(row.last_seen),
        ],
      ),
    );
  }

  const seededContracts = new Set();
  for (const row of rows) {
    const slug = companySlug(row.company_name || row.company || "");
    const text = contracts.get(slug);
    if (!text || seededContracts.has(slug)) continue;
    seededContracts.add(slug);
    statements.push(
      insert(
        "notes",
        [
          "id",
          "contact_id",
          "company_id",
          "sales_id",
          "title",
          "content",
          "source",
          "status",
          "attachments",
          "created_at",
          "updated_at",
        ],
        [
          800000 + number(row.id),
          number(row.id),
          number(row.company_id, 0) || null,
          number(row.sales_id, 0),
          `${slug}.md`,
          text,
          "contract",
          row.status || "warm",
          [],
          iso(row.last_seen),
          iso(row.last_seen),
        ],
      ),
    );
  }

  statements.push(
    insert(
      "configuration",
      ["key", "value", "updated_at"],
      [
        "crm",
        {
          title: "Atomic CRM Staging",
          seededFrom: csvPath,
          seedVersion: 1,
        },
        now,
      ],
    ),
    "PRAGMA foreign_keys = ON;",
  );
  return statements.join("\n") + "\n";
}

async function main() {
  const database = process.env.STAGING_DATABASE ?? stagingDatabase;
  const config = process.env.STAGING_WRANGLER_CONFIG ?? stagingConfig;
  if (database !== stagingDatabase || config !== stagingConfig) {
    throw new Error(
      `Refusing non-staging target. Expected ${stagingConfig}/${stagingDatabase}.`,
    );
  }

  const csv = await readFile(csvPath, "utf8");
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0)
    throw new Error(`Fixture parse failed: ${JSON.stringify(parsed.errors)}`);
  const contracts = new Map();
  for (const file of [
    "gottlieb-and-sons.md",
    "grady-llc.md",
    "bergstrom-inc.md",
    "okuneva-group.md",
    "schmitt-and-sons.md",
  ]) {
    contracts.set(
      file.replace(/\.md$/, ""),
      await readFile(path.join("server/contracts", file), "utf8"),
    );
  }
  const testEmail = process.env.STAGING_TEST_EMAIL?.trim() || null;
  const seedSql = buildSeedSql(parsed.data, testEmail, contracts);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, seedSql);
  console.log(`Generated ${outputPath} from ${parsed.data.length} contacts.`);

  if (hasFlag("--dry-run")) return;
  await execFileAsync(
    "wrangler",
    [
      "d1",
      "execute",
      stagingDatabase,
      "--remote",
      "--file",
      outputPath,
      "--config",
      stagingConfig,
    ],
    { stdio: "inherit" },
  );
  const expected = expectedCounts(parsed.data, testEmail, contracts);
  for (const [table, expectedCount] of Object.entries(expected)) {
    const { stdout } = await execFileAsync(
      "wrangler",
      [
        "d1",
        "execute",
        stagingDatabase,
        "--remote",
        "--json",
        "--command",
        `SELECT COUNT(*) AS count FROM ${table}`,
        "--config",
        stagingConfig,
      ],
      { maxBuffer: 2 * 1024 * 1024 },
    );
    const jsonStart = stdout.indexOf("[");
    const result = JSON.parse(stdout.slice(jsonStart));
    const actual = Number(result[0]?.results?.[0]?.count ?? 0);
    if (actual !== expectedCount) {
      throw new Error(
        `Staging seed verification failed for ${table}: expected ${expectedCount}, got ${actual}`,
      );
    }
    console.log(`Verified ${table}: ${actual}`);
  }
  console.log("Staging demo seed applied.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
