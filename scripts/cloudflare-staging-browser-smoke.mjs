import { chromium } from "playwright";

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

const login = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, rememberMe: true }),
});
if (!login.ok) throw new Error(`Staging sign-in failed (${login.status})`);

const setCookie = login.headers.get("set-cookie");
if (!setCookie) throw new Error("Staging sign-in returned no session cookie");
const [cookiePair] = setCookie.split(";");
const separator = cookiePair.indexOf("=");
if (separator < 1) throw new Error("Invalid staging session cookie");

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    await context.addCookies([
      {
        name: cookiePair.slice(0, separator),
        value: cookiePair.slice(separator + 1),
        url: baseUrl,
        secure: true,
        httpOnly: true,
      },
    ]);
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    for (const route of [
      "/",
      "/profile",
      "/settings",
      "/import",
      "/contacts",
    ]) {
      await page.goto(`${baseUrl}${route}`, {
        waitUntil: "networkidle",
        timeout: 45_000,
      });
      const body = await page.locator("body").innerText();
      if (
        /Something went wrong|client error occurred|Application error/i.test(
          body,
        )
      ) {
        throw new Error(`${viewport.name} ${route}: visible client error`);
      }
      if (pageErrors.length > 0) {
        throw new Error(`${viewport.name} ${route}: ${pageErrors.join("; ")}`);
      }
      console.log(`PASS browser ${viewport.name} ${route}`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Staging browser smoke checks passed: ${baseUrl}`);
