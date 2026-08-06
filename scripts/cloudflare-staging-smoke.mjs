const baseUrl = (
  process.env.STAGING_AUTH_BASE_URL ??
  "https://atomic-crm-staging.gittech.workers.dev"
).replace(/\/$/, "");
const expectedCopilotStatus = Number(
  process.env.STAGING_EXPECT_COPILOT_STATUS ?? 200,
);

const request = async (path, init) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.text();
  let parsed = body;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Keep non-JSON response text in the failure message.
  }
  return { response, body: parsed };
};

const assertStatus = (label, result, expected) => {
  if (result.response.status !== expected) {
    throw new Error(
      `${label}: expected HTTP ${expected}, received ${result.response.status}: ${JSON.stringify(result.body)}`,
    );
  }
  console.log(`PASS ${label} (${expected})`);
};

const health = await request("/api/health");
assertStatus("health", health, 200);
if (health.body?.ok !== true) throw new Error("health response is not healthy");

const me = await request("/api/me");
assertStatus("unauthenticated session", me, 401);

const configuration = await request("/api/configuration");
assertStatus("unauthenticated configuration", configuration, 401);

const crm = await request("/api/crm/contacts");
assertStatus("unauthenticated CRM API", crm, 401);

const copilot = await request("/api/copilotkit/info");
assertStatus("CopilotKit boundary", copilot, expectedCopilotStatus);

const email = process.env.STAGING_TEST_EMAIL?.trim();
const password = process.env.STAGING_TEST_PASSWORD;
if (email && password) {
  const login = await request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe: true }),
  });
  assertStatus("Better Auth sign-in", login, 200);

  const cookie = login.response.headers.get("set-cookie");
  if (!cookie)
    throw new Error("Better Auth sign-in did not return a session cookie");
  const authenticatedMe = await request("/api/me", {
    headers: { Cookie: cookie.split(";")[0] },
  });
  assertStatus("authenticated /api/me", authenticatedMe, 200);

  const authHeaders = { Cookie: cookie.split(";")[0] };
  const authenticatedConfiguration = await request("/api/configuration", {
    headers: authHeaders,
  });
  assertStatus("authenticated configuration", authenticatedConfiguration, 200);

  const authenticatedContacts = await request("/api/crm/contacts?perPage=1", {
    headers: authHeaders,
  });
  assertStatus("authenticated CRM contacts", authenticatedContacts, 200);

  const smokeEmail = `staging-smoke-${Date.now()}@example.invalid`;
  const createdContact = await request("/api/crm/contacts", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: "Staging",
      last_name: "Smoke",
      email: smokeEmail,
    }),
  });
  assertStatus("authenticated contact create", createdContact, 201);
  const contactId = createdContact.body?.data?.id;
  if (!Number.isSafeInteger(contactId))
    throw new Error("Contact create did not return a numeric id");

  const createdNote = await request("/api/crm/notes", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      contact_id: contactId,
      title: "Staging smoke note",
      content: "Created by the authenticated staging smoke test.",
    }),
  });
  assertStatus("authenticated note create", createdNote, 201);

  const createdTask = await request("/api/crm/tasks", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      contact_id: contactId,
      title: "Staging smoke task",
      text: "Created by the authenticated staging smoke test.",
    }),
  });
  assertStatus("authenticated task create", createdTask, 201);

  const form = new FormData();
  form.append(
    "file",
    new Blob(["staging smoke attachment"], { type: "text/plain" }),
    "staging-smoke.txt",
  );
  form.append("noteId", String(createdNote.body?.data?.id ?? ""));
  const uploaded = await request("/api/uploads", {
    method: "POST",
    headers: authHeaders,
    body: form,
  });
  assertStatus("authenticated attachment upload", uploaded, 201);

  const attachmentUrl = uploaded.body?.data?.url;
  if (!attachmentUrl) throw new Error("Attachment upload returned no URL");
  const attachment = await request(attachmentUrl, { headers: authHeaders });
  assertStatus("authenticated attachment download", attachment, 200);

  const cleanup = async (label, path) => {
    const result = await request(path, {
      method: "DELETE",
      headers: authHeaders,
    });
    assertStatus(label, result, 204);
  };
  await cleanup("authenticated attachment delete", attachmentUrl);
  if (createdTask.body?.data?.id)
    await cleanup(
      "authenticated task delete",
      `/api/crm/tasks/${createdTask.body.data.id}`,
    );
  if (createdNote.body?.data?.id)
    await cleanup(
      "authenticated note delete",
      `/api/crm/notes/${createdNote.body.data.id}`,
    );
  await cleanup(
    "authenticated contact delete",
    `/api/crm/contacts/${contactId}`,
  );
} else {
  console.log(
    "SKIP authenticated checks (set STAGING_TEST_EMAIL and STAGING_TEST_PASSWORD)",
  );
}

console.log(`Staging smoke checks passed: ${baseUrl}`);
