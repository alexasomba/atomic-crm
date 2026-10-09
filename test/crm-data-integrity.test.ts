import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { crmApi } from "../server/api/crm";
vi.mock("../server/auth.js", () => ({
  createAuth: () => ({
    api: { getSession: async () => ({ user: { id: "u1" } }) },
  }),
}));
let db: DatabaseSync;
const database = {
  prepare(query: string) {
    let params: unknown[] = [];
    const statement = {
      bind(...values: unknown[]) {
        params = values;
        return statement;
      },
      async all() {
        return { results: db.prepare(query).all(...(params as never[])) };
      },
      async raw() {
        return db
          .prepare(query)
          .all(...(params as never[]))
          .map(Object.values);
      },
      async run() {
        return db.prepare(query).run(...(params as never[]));
      },
    };
    return statement;
  },
};
const request = (path: string, body?: unknown) =>
  crmApi.request(
    `http://localhost${path}`,
    body
      ? {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
    { DB: database } as never,
  );
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  for (const name of readdirSync("drizzle").sort()) {
    if (name === "meta") continue;
    db.exec(readFileSync(`drizzle/${name}/migration.sql`, "utf8"));
  }
  db.exec("PRAGMA foreign_keys=OFF");
  db.exec(
    "INSERT INTO sales(id, user_id, first_name, last_name, email, role, disabled, created_at, updated_at) VALUES (1,'u1','User','One','user@example.com','admin',0,'now','now')",
  );
});
afterEach(() => db.close());
describe("Cloudflare CRM data contract", () => {
  it("checks a task without clearing its description, owner, or due date", async () => {
    db.exec(
      "INSERT INTO tasks(id, title, description, sales_id, due_date, status, created_at, updated_at) VALUES (1,'Call client','Discuss renewal',1,'2026-10-10','pending','now','now')",
    );
    const response = await request("/tasks/1", { done_date: "2026-10-09" });
    expect(response.status).toBe(200);
    expect(
      db
        .prepare(
          "SELECT title,description,sales_id,due_date FROM tasks WHERE id=1",
        )
        .get(),
    ).toMatchObject({
      title: "Call client",
      description: "Discuss renewal",
      sales_id: 1,
      due_date: "2026-10-10",
    });
  });
  it("reorders a deal without clearing its name, amount, or stage", async () => {
    db.exec(
      "INSERT INTO deals(id, name, amount, stage, position, status, created_at, updated_at) VALUES (1,'Renewal',42000,'negotiation',0,'open','now','now')",
    );
    const response = await request("/deals/1", { index: 4 });
    expect(response.status).toBe(200);
    expect(
      db
        .prepare("SELECT name,amount,stage,position FROM deals WHERE id=1")
        .get(),
    ).toMatchObject({
      name: "Renewal",
      amount: 42000,
      stage: "negotiation",
      position: 4,
    });
  });
  it("filters related tasks, sorts them, and counts every matching page", async () => {
    db.exec(
      "INSERT INTO tasks(id, title, sales_id, status, created_at, updated_at) VALUES (1,'A',1,'pending','now','now'),(2,'B',1,'pending','now','now'),(3,'Other',2,'pending','now','now')",
    );
    const response = await request(
      "/tasks?filter=" +
        encodeURIComponent(JSON.stringify({ sales_id: 1 })) +
        "&sort=title&order=DESC&perPage=1",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      total: 2,
      data: [{ title: "B" }],
    });
  });
  it("preserves explicit nulls and rejects invalid filters instead of returning unrelated rows", async () => {
    db.exec(
      "INSERT INTO notes(id,title,content,source,created_at,updated_at) VALUES(1,'Title','Body','manual','now','now')",
    );
    expect((await request("/notes/1", { title: null })).status).toBe(200);
    expect(
      db.prepare("SELECT title,content FROM notes WHERE id=1").get(),
    ).toMatchObject({ title: null, content: "Body" });
    expect(
      (
        await request(
          "/tasks?filter=" +
            encodeURIComponent(JSON.stringify({ "unrecognized@eq": 1 })),
        )
      ).status,
    ).toBe(400);
  });
  it("routes contact list reads before generic resources and filters JSON membership and nulls", async () => {
    db.exec(
      `INSERT INTO contacts(id,first_name,last_name,tags,created_at,updated_at) VALUES(1,'Ada','One','["vip"]','now','now'),(2,'Bea','Two','[]','now','now')`,
    );
    const response = await request(
      "/contacts?filter=" +
        encodeURIComponent(
          JSON.stringify({ "tags@cs": ["vip"], "company_id@is": null }),
        ) +
        "&sort=first_name&order=ASC",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      total: 1,
      data: [{ firstName: "Ada" }],
    });
  });
});
