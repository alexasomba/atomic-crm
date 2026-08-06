# Cloudflare migration

The Cloudflare runtime is being introduced as a strangler alongside the existing
Node/CopilotKit runtime. `vp run dev:all` remains the compatibility workflow
described in the README. Use `vp run dev:cloudflare` to run the Vite frontend
against the Worker, or `wrangler dev --config wrangler.jsonc` for the Worker
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

`vp run dev:all` now uses strict, explicit ports. Defaults are Vite 5173,
CopilotKit 4000, and MCP 3108; override them with `VITE_DEV_PORT`,
`COPILOTKIT_PORT`, and `MCP_PORT` when another local process is using a port.
The command then keeps the frontend CORS origin aligned with the selected Vite
port.

For a Supabase export, provide `VITE_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`, then run `pnpm run data:export`. The export now
includes CRM tables, non-secret Auth user metadata, and an attachment byte
archive under `migration-data/storage/attachments` with a
`migration-data/storage-manifest.json` manifest. Password hashes are not
exported: verify whether the existing Supabase hashes can be safely imported
before cutover; otherwise require a one-time Better Auth password reset. Set
`MIGRATION_SKIP_STORAGE=1` only when a storage export is intentionally being
performed separately.

Review the generated `migration-data/d1-import.sql` from `pnpm run data:import`;
it is a dry run by default. Set `MIGRATION_APPLY=1 MIGRATION_TARGET=local` only
after reviewing the SQL. Run `MIGRATION_TARGET=local pnpm run data:reconcile`
after import. Remote application requires the explicit
`MIGRATION_TARGET=remote` choice and staging validation first. The attachment
archive is deliberately separate from the SQL import because D1 and R2 do not
share a transaction; upload it to R2 with an idempotent, checksum-verified
import job and reconcile the resulting D1 metadata before production cutover.
For an exported Supabase snapshot, run `MIGRATION_EXPORT=... pnpm run
data:reconcile:staging` to compare it with the deployed staging database; the
script uses `wrangler.staging.jsonc` and cannot target the default database.

The repository pins the Drizzle v1 release candidate and the matching Better
Auth release candidate. The beta Better Auth CLI is used because it emits
Drizzle v1 `defineRelationsPart` output; the stable CLI currently emits the
removed legacy `relations()` helper. `server/db/auth-schema.ts` is generated
code: change `server/auth.ts`, then regenerate it rather than editing it.

## Email

Cloudflare Email Service is configured through the `EMAIL` send binding. The
production domain must be verified and its SPF, DKIM, DMARC, sender, and
suppression settings configured before outbound auth mail is enabled.

Inbound mail is routed to the Worker at `crm@example.com` in development (set
`VITE_INBOUND_EMAIL_ADDRESS` for another address). The Worker stores the raw
message in R2, records an idempotency row in D1, queues MIME parsing, matches
known contacts, and writes notes, activities, and attachment metadata in a D1
batch. Unmatched messages remain in R2 and are marked `unmatched` for
operational follow-up.

## Frontend provider

The Cloudflare `ra-core` providers are available from
`src/components/atomic-crm/providers/cloudflare`. Set
`VITE_CLOUDFLARE_API_URL` to the Worker origin and pass those providers to the
`CRM` component when testing the new path. Alternatively, set
`VITE_CRM_PROVIDER=cloudflare` to select them automatically. Supabase remains
the default rollback path until data reconciliation, sales-role
synchronization, attachments, and all custom CRM resources have passed staging
tests.

The profile page reads `VITE_INBOUND_EMAIL_ADDRESS`; the older
`VITE_INBOUND_EMAIL` name remains a temporary fallback for existing Supabase
deployments and should be removed after Cloudflare cutover.

The Worker now exposes authenticated attachment upload/download/delete routes
backed by R2 and a bounded `/api/ai` route backed by Workers AI. The AI route is
an isolated compatibility spike; CopilotKit remains on the existing Node
runtime until streaming, MCP, and human-approval behavior are verified on the
Worker runtime. When the frontend is served by the Worker, set
`COPILOTKIT_RUNTIME_URL` to the Node CopilotKit service. The Worker forwards
`/api/copilotkit` requests to that configured runtime, preserving streaming
responses and the browser contract. If it is empty, the Worker returns an
explicit `501` configuration response instead of a misleading route-not-found
error.

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
`wrangler.staging.jsonc`. Its D1 migrations are applied and the health,
authentication boundary, and explicit CopilotKit runtime configuration response
have been smoke-tested. Set a publicly reachable `COPILOTKIT_RUNTIME_URL` before
testing CopilotKit remotely; `localhost` is intentionally not used by the
deployed staging Worker. The historical Render URL currently returns 404, so
it must not be configured until that service is deployed and responds to the
CopilotKit endpoint. Email Sending is enabled for
`atomic-crm.asomba.com`, with `noreply@atomic-crm.asomba.com` configured as the
sender and `crm@atomic-crm.asomba.com` routed to the staging Worker. Inbound
delivery is ready; the three Cloudflare Email Routing MX records now resolve
for the subdomain.
