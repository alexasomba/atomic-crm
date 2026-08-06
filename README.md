# Atomic CRM

A full-featured CRM built with React, Vite+, shadcn-admin-kit/Base UI, Supabase, and a staged Cloudflare backend.

<https://github.com/user-attachments/assets/0d7554b5-49ef-41c6-bcc9-a76214fc5c99>

Atomic CRM is free and open-source. You can test it online at <https://marmelab.com/atomic-crm-demo>.

## Features

- 📇 **Organize Contacts**: Keep all your contacts in one easily accessible place.
- ⏰ **Create Tasks & Set Reminders**: Never miss a follow-up or deadline.
- 📝 **Take Notes**: Capture important details and insights effortlessly.
- ✉️ **Capture Emails**: CC Atomic CRM to automatically save communications as notes.
- 📊 **Manage Deals**: Visualize and track your sales pipeline in a Kanban board.
- 🔄 **Import & Export Data**: Easily transfer contacts in and out of the system.
- 🔐 **Control Access**: Log in with Google, Azure, Keycloak, and Auth0.
- 📜 **Track Activity History**: View all interactions in aggregated activity logs.
- 🔗 **Integrate via API**: Connect seamlessly with other systems using our API.
- 🛠️ **Customize Everything**: Add custom fields, change the theme, and replace any component to fit your needs.

## Installation and local development

To run this project locally, you will need the following tools installed on your computer:

- Make
- Node 22 LTS
- Docker (required by Supabase)

Fork the [`marmelab/atomic-crm`](https://github.com/marmelab/atomic-crm) repository to your user/organization, then clone it locally:

```sh
git clone https://github.com/[username]/atomic-crm.git
```

Install dependencies with Vite+:

```sh
cd atomic-crm
make install
```

This will install the dependencies for the frontend and the backend, including a local Supabase instance.

Start the Supabase-backed app locally:

```sh
make start
```

This will start the Vite dev server for the frontend, the local Supabase instance for the API, and a Postgres database (thanks to Docker).

You can then access the app via [http://localhost:5173/](http://localhost:5173/). You will be prompted to create the first user.

For the demo provider, use `make start-demo`. To run the frontend, CopilotKit runtime, and MCP server together, use `vp run dev:all`. The staged Cloudflare/D1/Better Auth path is available with `vp run dev:cloudflare` and `VITE_CRM_PROVIDER=cloudflare`.

If you need debug the backend, you can access the following services:

- Supabase dashboard: [http://localhost:54323/](http://localhost:54323/)
- REST API: [http://127.0.0.1:54321](http://127.0.0.1:54321)
- Attachments storage: [http://localhost:54323/project/default/storage/buckets/attachments](http://localhost:54323/project/default/storage/buckets/attachments)
- Inbucket email testing service: [http://localhost:54324/](http://localhost:54324/)

## CopilotKit assistant

The in-app CopilotKit assistant uses the Cloudflare Worker runtime in staging and
production, with the Node runtime retained only for local rollback and MCP
development (see `render.yaml`):

- `atomic-crm-app` — the static frontend (this repo)
- `atomic-crm-copilot` — the local/rollback CopilotKit runtime (Hono server in `server/`)
- `atomic-crm-mcp` — the MCP contract analyzer (also in `server/mcp/`)

The chat UI uses shadcn Base UI primitives for message rows, bubbles, streaming markers, anchored transcript scrolling, attachments, and guided Copilot briefs.

Two env vars wire the frontend to the runtime:

- `VITE_COPILOTKIT_RUNTIME_URL` — optional alternate CopilotKit endpoint. Leave unset to use the same-origin Worker route, `/api/copilotkit`.
- `VITE_COPILOTKIT_API_URL` — base URL for the runtime's REST endpoints used by frontend tools (`/api/contacts`, `/api/leads/top`, etc.). Read at build time.

### Local dev workflows

Run the **full local stack** (frontend + copilot runtime + MCP) — needs an LLM provider configured in `server/.env`:

```sh
  vp run dev:all
```

Or run **only the frontend against the local Node rollback runtime** (no Worker needed):

```sh
VITE_COPILOTKIT_API_URL=http://localhost:5173 \
COPILOTKIT_PROXY_TARGET=http://localhost:4000 \
  vp run dev:demo
```

The vite dev server proxies `/api/*` to `COPILOTKIT_PROXY_TARGET` so tool calls and chat both flow through the same origin (no CORS).

When using the local proxy target, start the CopilotKit runtime with
`make start-server`; otherwise the browser will report connection-refused proxy
errors for `/api/copilotkit`.

### Cloudflare Worker workflow

The staged Cloudflare runtime can be started with:

```sh
vp run dev:cloudflare
```

This runs the Vite frontend and Wrangler Worker together. Set
`VITE_CRM_PROVIDER=cloudflare` to exercise the D1/Better Auth provider; leave
it unset to keep the Supabase provider as the rollback default. Configure
`BETTER_AUTH_SECRET` in `.dev.vars` before using authentication. Apply local
D1 migrations with `pnpm run d1:migrate:local`.
The staging Worker serves CopilotKit natively through the TanStack AI
CopilotKit factory and its `AI` binding. Set `CLOUDFLARE_AI_MODEL` if you need a
different Workers AI model; no account ID or AI API token is required. Use
`COPILOTKIT_RUNTIME_MODE=proxy` only for the local Node rollback path.
Build the staging frontend with `vp run build:staging`; this selects the
Cloudflare data/auth providers and same-origin Worker API before deployment.

### Router

TanStack Router is the canonical application and test router. Set
`VITE_ROUTER=tanstack` for an explicit local smoke test; `vp run build:staging`
enables it automatically. URLs, query strings, resource routes, and ra-core
data fetching remain unchanged.

`react-router` and `react-router-dom` remain direct compatibility dependencies
because the current `ra-core` release statically imports its React Router
adapter even when a custom router provider is configured. The CRM has no
application or test imports of React Router. Those compatibility packages can
be removed after upgrading to an `ra-core` release that no longer requires that
adapter.

## Documentation

The user and developer documentation for this project is available [in the `doc/` directory](./doc/). You can also read it online at [https://marmelab.com/atomic-crm/doc/](https://marmelab.com/atomic-crm/doc/).

## Testing and builds

This project contains Vitest unit and browser tests. Run them with the following command:

```sh
vp test
```

Use `vp check` for formatting, linting, and typechecking, `make typecheck` to skip formatting/linting, and `vp build` for a production build. You can add tests anywhere in `src`; use `*.test.tsx` or `*.test.ts`.

## Vite+ build diagnostics

The root project uses Vite+ 0.2.8 for installation, checking, testing, development, and production builds. Production sourcemaps remain enabled. Current builds report large application chunks because the CRM resource definitions are eagerly registered by the admin shell; the measured main application chunk is approximately 2.7 MB minified (812 kB gzip). This warning is retained so future route-level splitting is driven by a measured payload improvement rather than hidden with a higher warning limit.

Tailwind CSS and Vite CSS post-processing may report `SOURCEMAP_BROKEN` warnings because those upstream transforms do not emit sourcemaps. These warnings are documented here and are not suppressed by disabling production sourcemaps.

## Registry

Atomic CRM components are published as a Shadcn Registry file:

- The `registry.json` file is automatically generated by the `scripts/generate-registry.mjs` script as a pre-commit hook.
- The `http://marmelab.com/atomic-crm/r/atomic-crm.json` file is automatically published by the CI/CD pipeline

> [!WARNING]  
> If the `registry.json` misses some changes you made, you MUST update the `scripts/generate-registry.mjs` to include those changes.

## License

This project is licensed under the MIT License, courtesy of [Marmelab](https://marmelab.com). See the [LICENSE.md](./LICENSE.md) file for details.
