const baseUrl = (
  process.env.STAGING_AUTH_BASE_URL ??
  "https://atomic-crm-staging.gittech.workers.dev"
).replace(/\/$/, "");
const email = process.env.STAGING_TEST_EMAIL?.trim();
const password = process.env.STAGING_TEST_PASSWORD;

if (!email || !password) {
  throw new Error(
    "Set STAGING_TEST_EMAIL and STAGING_TEST_PASSWORD; credentials are never stored by this script.",
  );
}
if (password.length < 12) {
  throw new Error("STAGING_TEST_PASSWORD must contain at least 12 characters.");
}

const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email,
    password,
    name: "Staging Test User",
  }),
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Better Auth signup failed (${response.status}): ${body}`);
}

const result = await response.json();
console.log(
  `Created staging auth user ${result.user?.id ?? "(id unavailable)"}.`,
);
console.log(
  "Complete email verification from the delivered message before testing login.",
);
