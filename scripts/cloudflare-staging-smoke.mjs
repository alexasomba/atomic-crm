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
} else {
  console.log(
    "SKIP authenticated checks (set STAGING_TEST_EMAIL and STAGING_TEST_PASSWORD)",
  );
}

console.log(`Staging smoke checks passed: ${baseUrl}`);
