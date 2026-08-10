.PHONY: help install env spec-build api-types db-up db-down migrate setup \
	backend-dev frontend-dev dev build test lint typecheck

help: ## Показать список доступных команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Установить зависимости монорепозитория
	pnpm install

env: ## Создать .env файлы из .env.example (если ещё не существуют)
	[ -f apps/backend/.env ] || cp apps/backend/.env.example apps/backend/.env
	[ -f apps/frontend/.env ] || cp apps/frontend/.env.example apps/frontend/.env

spec-build: ## Собрать OpenAPI-спецификацию из контракта TypeSpec
	pnpm --filter scheduling-api-spec build

api-types: spec-build ## Сгенерировать TypeScript-типы API для фронтенда
	pnpm --filter frontend generate:api-types

db-up: ## Поднять локальную PostgreSQL (docker compose)
	docker compose up -d postgres

db-down: ## Остановить и удалить контейнеры docker compose
	docker compose down

migrate: ## Применить миграции схемы БД бэкенда
	pnpm --filter backend migration:run

setup: install env spec-build api-types db-up migrate ## Первый запуск проекта: install + env + spec + api-types + db + migrate

backend-dev: ## Запустить бэкенд в режиме разработки
	pnpm --filter backend start:dev

frontend-dev: ## Запустить фронтенд в режиме разработки
	pnpm --filter frontend dev

dev: db-up ## Поднять БД и запустить бэкенд + фронтенд одновременно
	@trap 'kill 0' EXIT INT TERM; \
	$(MAKE) backend-dev & \
	$(MAKE) frontend-dev & \
	wait

build: ## Собрать бэкенд и фронтенд (production)
	pnpm --filter backend build
	pnpm --filter frontend build

test: ## Прогнать тесты бэкенда и фронтенда
	pnpm --filter backend test
	pnpm --filter frontend test

lint: ## Прогнать линтеры бэкенда и фронтенда
	pnpm --filter backend lint
	pnpm --filter frontend lint

typecheck: ## Проверить типы фронтенда
	pnpm --filter frontend typecheck
