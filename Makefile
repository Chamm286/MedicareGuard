.PHONY: help install dev backend frontend db-migrate db-seed docker-up docker-down docker-reset screenshots test lint

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

lint: ## Lint frontend
	cd frontend && npm run lint
