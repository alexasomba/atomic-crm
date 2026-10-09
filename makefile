.PHONY: build help

help:
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: package.json ## install dependencies
	pnpm install
	@(cd server && npm install)

start-app: ## start the app locally
	pnpm exec vp run dev:cloudflare

install-server: ## install server dependencies
	@(cd server && npm install)

start-server: ## start the CopilotKit runtime server
	@(cd server && npm run dev)

start-mcp: ## start the MCP contract analyzer server
	@(cd server && npm run dev:mcp)

start: start-app ## start the stack locally

start-demo: ## start the app locally in demo mode
	pnpm exec vp run dev:demo

start-all: ## start everything (app + Cloudflare Worker + MCP server)
	pnpm exec vp run dev:all

stop: ## stop the local stack (Ctrl-C terminates vp run dev:cloudflare)
	@true

build: ## build the app
	pnpm exec vp build

build-demo: ## build the app in demo mode
	pnpm exec vp run build:demo

prod-start: build
	open http://127.0.0.1:3000 && npx serve -l tcp://127.0.0.1:3000 dist

prod-deploy: build
	pnpm run ghpages:deploy


test:
	pnpm exec vp test

test-ci:
	CI=1 pnpm exec vp test

lint:
	pnpm exec vp check

publish:
	npm publish

typecheck:
	pnpm exec vp check --no-fmt --no-lint

doc-install:
	@(cd doc && npm install)

doc: doc-dev

doc-dev:
	@(cd doc && npm run dev)

doc-build:
	@(cd doc && npm run build)

doc-preview: doc-build
	@(cd doc && npm run preview)

doc-deploy:
	@(cd doc && pnpm exec gh-pages -b gh-pages -d dist -e doc -m "Deploy docs" --remove doc)

registry-build: ## build the shadcn registry
	pnpm exec vp run registry:build

registry-deploy: registry-build ## Deploy the shadcn registry (Automatically done by CI/CD pipeline)
	@(cd public/r && pnpm exec gh-pages -b gh-pages -d ./ -s atomic-crm.json -e r -m "Deploy registry" --remove r)

registry-gen: ## Generate the shadcn registry (ran automatically by a pre-commit hook)
	pnpm exec vp run registry:gen
	pnpm exec vp fmt registry.json --write
