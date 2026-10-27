.PHONY: help install dev backend frontend db-migrate db-seed docker-up docker-down docker-reset screenshots test typecheck lint n8n-build n8n-token n8n-setup

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install root, backend and frontend dependencies
	npm install
	cd backend && npm install
	cd frontend && npm install

dev: ## Run backend + frontend in development (requires local postgres)
	$(MAKE) -j2 backend frontend

backend: ## Run backend dev server
	cd backend && npm run dev

frontend: ## Run frontend dev server
	cd frontend && npm run dev

db-migrate: ## Apply database schema
	cd backend && npm run migrate

db-seed: ## Seed demo data
	cd backend && npm run seed

docker-up: ## Start the full stack with Docker Compose
	docker compose up -d --build

docker-down: ## Stop the stack
	docker compose down

docker-reset: ## Stop stack and delete volumes
	docker compose down -v

screenshots: ## Capture UI screenshots with Playwright
	npx playwright install chromium
	node scripts/capture-screenshots.mjs

test: ## Run backend integration smoke test
	cd backend && npm test

typecheck: ## Type-check the frontend
	cd frontend && npx tsc --noEmit

n8n-build: ## Regenerate the 40-node n8n workflow definitions
	node scripts/build-n8n-workflows.mjs

n8n-token: ## Mint a 30-day JWT for n8n service calls
	cd backend && npm run --silent token:n8n

n8n-setup: n8n-build ## Import, publish and activate MedicareGuard workflows in local n8n
	bash scripts/setup-n8n.sh

lint: typecheck ## Alias for typecheck
