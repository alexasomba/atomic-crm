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

For a Supabase export, provide `VITE_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`, then run `pnpm run data:export`. Review the
generated `migration-data/d1-import.sql` from `pnpm run data:import`; it is a
dry run by default. Set `MIGRATION_APPLY=1 MIGRATION_TARGET=local` only after
reviewing the SQL. Run `MIGRATION_TARGET=local pnpm run data:reconcile` after
import. Remote application requires the explicit `MIGRATION_TARGET=remote`
choice and staging validation first.

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
message in R2, records an idempotency row in D1, and queues MIME parsing. A
temporary queue consumer currently records the parsed message and marks it
processed; CRM contact/note association remains the next strangler slice.

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
Worker runtime.

Run `pnpm run test:worker` for the Worker HTTP boundary tests. These use Hono's
in-process request adapter and do not require a Cloudflare account.

No production database ID or email domain is committed. Replace the placeholder
`database_id`, bucket, queue, and sender values in an environment-specific
Wrangler configuration before deploying.
