.PHONY: build help

help:
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: package.json ## install dependencies
	pnpm install

start-supabase: ## start supabase locally
	pnpm dlx supabase start

start-supabase-functions: ## start the supabase Functions watcher
	pnpm dlx supabase functions serve

supabase-migrate-database: ## apply the migrations to the database
	pnpm dlx supabase migration up

supabase-reset-database: ## reset (and clear!) the database
	pnpm dlx supabase db reset

start-app: ## start the app locally
	pnpm run dev

install-server: ## install server dependencies
	pnpm install --filter atomic-crm-server

start-server: ## start the CopilotKit runtime server
	pnpm --filter atomic-crm-server run dev

start-mcp: ## start the MCP contract analyzer server
	pnpm --filter atomic-crm-server run dev:mcp

start: start-supabase start-app ## start the stack locally

start-demo: ## start the app locally in demo mode
	pnpm run dev:demo

start-all: ## start everything (app + CopilotKit server + MCP server)
	pnpm run dev:all

stop-supabase: ## stop local supabase
	pnpm dlx supabase stop

stop: stop-supabase ## stop the stack locally

build: ## build the app
	pnpm run build

build-demo: ## build the app in demo mode
	pnpm run build:demo

prod-start: build supabase-deploy
	open http://127.0.0.1:3000 && pnpm exec vp preview --host 127.0.0.1 --port 3000

prod-deploy: build supabase-deploy
	pnpm run ghpages:deploy

supabase-remote-init:
	pnpm run supabase:remote:init
	$(MAKE) supabase-deploy

supabase-deploy:
	pnpm dlx supabase db push
	pnpm dlx supabase functions deploy

test:
	pnpm test

test-ci:
	CI=1 pnpm test

lint:
	pnpm run lint
	pnpm run prettier

publish:
	pnpm publish

typecheck:
	pnpm run typecheck

doc-install:
	pnpm install

doc: doc-dev

doc-dev:
	pnpm --filter atomic-crm-doc run dev

doc-build:
	pnpm --filter atomic-crm-doc run build

doc-preview: doc-build
	pnpm --filter atomic-crm-doc run preview

doc-deploy:
	pnpm exec gh-pages -b gh-pages -d doc/dist -e doc -m "Deploy docs" --remove doc

registry-build: ## build the shadcn registry
	pnpm run registry:build

registry-deploy: registry-build ## Deploy the shadcn registry (Automatically done by CI/CD pipeline)
	pnpm exec gh-pages -b gh-pages -d public/r -s atomic-crm.json -e r -m "Deploy registry" --remove r

registry-gen: ## Generate the shadcn registry (ran automatically by a pre-commit hook)
	pnpm run registry:gen
	pnpm exec vp fmt --write registry.json
