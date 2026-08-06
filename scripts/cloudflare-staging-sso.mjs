const baseUrl = (
  process.env.STAGING_AUTH_BASE_URL ??
  "https://atomic-crm-staging.gittech.workers.dev"
).replace(/\/$/, "");
const email = process.env.STAGING_ADMIN_EMAIL ?? process.env.STAGING_TEST_EMAIL;
const password =
  process.env.STAGING_ADMIN_PASSWORD ?? process.env.STAGING_TEST_PASSWORD;
const providerId = process.env.STAGING_SSO_PROVIDER_ID ?? "google-workspace";
const issuer = process.env.STAGING_SSO_ISSUER?.trim();
const domain = process.env.STAGING_SSO_DOMAIN?.trim();
const clientId = process.env.STAGING_SSO_CLIENT_ID?.trim();
const clientSecret = process.env.STAGING_SSO_CLIENT_SECRET;

if (!email || !password || !issuer || !domain || !clientId || !clientSecret) {
  throw new Error(
    "Set STAGING_ADMIN_EMAIL/STAGING_ADMIN_PASSWORD (or test equivalents), STAGING_SSO_ISSUER, STAGING_SSO_DOMAIN, STAGING_SSO_CLIENT_ID, and STAGING_SSO_CLIENT_SECRET.",
  );
}

const login = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, rememberMe: true }),
});
if (!login.ok)
  throw new Error(`Staging admin sign-in failed (${login.status})`);

const cookie = login.headers.get("set-cookie");
if (!cookie)
  throw new Error("Staging admin sign-in returned no session cookie");

const registration = await fetch(`${baseUrl}/api/auth/sso/register`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookie.split(";")[0],
  },
  body: JSON.stringify({
    providerId,
    issuer,
    domain,
    oidcConfig: { clientId, clientSecret },
  }),
});

if (registration.status === 409) {
  console.log(`PASS SSO provider already registered (${providerId})`);
} else if (!registration.ok) {
  const body = await registration.text();
  throw new Error(
    `SSO provider registration failed (${registration.status}): ${body}`,
  );
} else {
  console.log(`PASS SSO provider registered (${providerId})`);
}

console.log(
  `Callback URL: ${baseUrl}/api/auth/sso/callback/${encodeURIComponent(providerId)}`,
);
