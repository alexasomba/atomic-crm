# Cloudflare migration

The Cloudflare runtime is the application backend for local and staging. Use
`vp run dev:cloudflare` for the Vite frontend and Worker. Add MCP with
`vp run dev:all`, or run `wrangler dev --config wrangler.jsonc` for the Worker
alone.

## Local setup

1. Copy `.dev.vars.example` to `.dev.vars` and set a random
   `BETTER_AUTH_SECRET`.
2. Run `pnpm run worker:types` after changing `wrangler.jsonc`.
3. Generate the Better Auth schema with `pnpm run auth:generate`.
4. Check and generate Drizzle migrations with `pnpm run db:check` and
   `pnpm run db:generate`.
5. Apply local D1 migrations with `pnpm run d1:migrate:local`.

For staging validation without production data, run
`STAGING_TEST_EMAIL=you@example.com pnpm run data:seed:staging -- --dry-run` to
review the generated fixture SQL, then run `pnpm run data:seed:staging` to apply
it to the guarded `atomic-crm-staging-db` database. Add
`STAGING_TEST_EMAIL` when you want a matching contact for inbound-email tests.
Use `pnpm run data:seed:staging:reset` only when intentionally rebuilding the
staging dataset. Create a Better Auth test account with
`STAGING_TEST_EMAIL=you@example.com STAGING_TEST_PASSWORD='...' pnpm run
auth:bootstrap:staging`; the script never stores credentials and email
verification remains required.

Run the authenticated and unauthenticated staging boundary checks with
`pnpm run smoke:staging`. Add `STAGING_TEST_EMAIL` and
`STAGING_TEST_PASSWORD` to include the `/api/me` session check after the user
has completed Better Auth email verification. The smoke command defaults to
expecting HTTP 501 from `/api/copilotkit` while no runtime is configured; set
`STAGING_EXPECT_COPILOT_STATUS=200` only after a reachable CopilotKit runtime
has been deployed and configured.

`vp run dev:cloudflare` uses Vite 5173 and Wrangler 8787. `vp run dev:all`
adds the MCP server on 3108; override with `VITE_DEV_PORT`, and `MCP_PORT`
when another local process is using a port.

Staging data is deterministic and is created with `pnpm run data:seed:staging`.
Use the guarded `data:seed:staging:reset` command when intentionally rebuilding
staging; it preserves no production data and requires the staging target.

The repository pins the Drizzle v1 release candidate and the matching Better
Auth release candidate. The beta Better Auth CLI is used because it emits
Drizzle v1 `defineRelationsPart` output; the stable CLI currently emits the
removed legacy `relations()` helper. `server/db/auth-schema.ts` is generated
code: change `server/auth.ts`, then regenerate it rather than editing it.

## Email

Cloudflare Email Service is configured through the `EMAIL` send binding. The
production domain must be verified and its SPF, DKIM, DMARC, sender, and
suppression settings configured before outbound auth mail is enabled.

Inbound mail is routed to the Worker at `crm@atomic-crm.asomba.com` (set
`VITE_INBOUND_EMAIL_ADDRESS` for another local address). The Worker stores the raw
message in R2, records an idempotency row in D1, queues MIME parsing, matches
known contacts, and writes notes, activities, and attachment metadata in a D1
batch. Unmatched messages remain in R2 and are marked `unmatched` for
operational follow-up.

## Frontend provider

The Cloudflare `ra-core` providers in
`src/components/atomic-crm/providers/cloudflare` are the default application
providers. Set `VITE_CLOUDFLARE_API_URL` to a Worker origin when the frontend
and Worker are on different origins; same-origin deployment needs no override.

The profile page reads `VITE_INBOUND_EMAIL_ADDRESS`.

The Worker exposes authenticated attachment upload/download/delete routes backed
by R2 and a bounded `/api/ai` route backed by Workers AI. CopilotKit is served
natively at `/api/copilotkit` through CopilotKit v2's TanStack AI factory and
the native Workers AI `AI` binding. This preserves AG-UI streaming, frontend
tools, and human approval events without an AI API token. Set
`COPILOTKIT_RUNTIME_MODE=proxy` and `COPILOTKIT_RUNTIME_URL` only for the local
Node rollback path.

Run `pnpm run test:worker` for the Worker HTTP boundary tests. These use Hono's
in-process request adapter and do not require a Cloudflare account.

The Worker tests also cover the inbound email size and recipient rejection
guards. A real routed-mail smoke test still requires a verified sender mailbox:
seed the matching contact with `STAGING_TEST_EMAIL`, send a message to
`crm@atomic-crm.asomba.com`, then verify the resulting note, activity,
`inbound_email_events` status, and any R2 attachment metadata in staging.

No production database ID or email domain is committed. Replace the placeholder
`database_id`, bucket, queue, and sender values in an environment-specific
Wrangler configuration before deploying.

## Staging environment

The repository has a deployed staging Worker at
`https://atomic-crm-staging.gittech.workers.dev` using the resources declared in
`wrangler.staging.jsonc`. Its D1 migrations, health, authentication boundary,
and native CopilotKit route are validated through Wrangler smoke tests. Email
Sending is enabled for
`atomic-crm.asomba.com`, with `noreply@atomic-crm.asomba.com` configured as the
sender and `crm@atomic-crm.asomba.com` routed to the staging Worker. Inbound
delivery is ready; the three Cloudflare Email Routing MX records now resolve
for the subdomain.
