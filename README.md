### Hexlet tests and linter status:
[![Actions Status](https://github.com/AsanAbildin/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/AsanAbildin/ai-for-developers-project-386/actions)

## Структура репозитория

- `spec/` — контракт API (TypeSpec), собирается в `spec/tsp-output/openapi.yaml`.
- `apps/frontend/` — фронтенд на Nuxt 4 + Tailwind CSS + Nuxt UI. Работает как отдельная часть
  приложения и обращается к бэкенду только через API по контракту из `spec/`.
- `apps/backend/` — бэкенд на NestJS. Реализует контракт из `spec/`. Хранилище — PostgreSQL
  через TypeORM (см. `docker-compose.yml`), либо in-memory для быстрого старта/тестов
  (`STORAGE_DRIVER=memory`, см. `apps/backend/.env.example`).

## Требования

- Node.js 22+
- pnpm (используется как менеджер пакетов монорепозитория)

## Установка

```sh
pnpm install
```

## Генерация типов API для фронтенда

Перед первым запуском (и после изменения контракта в `spec/*.tsp`) нужно собрать спецификацию
и сгенерировать из неё TypeScript-типы для фронтенда:

```sh
pnpm --filter scheduling-api-spec build
pnpm --filter frontend generate:api-types
```

## Запуск фронтенда

Фронтенд запускается отдельно от бэкенда и обращается к нему по адресу из переменной окружения
`NUXT_PUBLIC_API_BASE_URL` (см. `apps/frontend/.env.example`).

```sh
cp apps/frontend/.env.example apps/frontend/.env
pnpm --filter frontend dev
```

Другие команды фронтенда:

```sh
pnpm --filter frontend build      # production-сборка
pnpm --filter frontend test       # юнит-тесты (vitest)
pnpm --filter frontend lint       # eslint
pnpm --filter frontend typecheck  # проверка типов
```

## Запуск бэкенда

Бэкенд — отдельный процесс, слушает `/api/*` на порту из `PORT` (по умолчанию `3000`, совпадает
с `NUXT_PUBLIC_API_BASE_URL` фронтенда по умолчанию).

По умолчанию (`STORAGE_DRIVER=postgres`) бэкенду нужна БД PostgreSQL. Поднять её локально:

```sh
docker compose up -d postgres
cp apps/backend/.env.example apps/backend/.env
pnpm --filter backend migration:run   # применяет миграции схемы
pnpm --filter backend start:dev
```

Без БД (данные хранятся в процессе и сбрасываются при перезапуске — удобно для быстрого старта
или тестов) — установить `STORAGE_DRIVER=memory` в `apps/backend/.env`.

Другие команды бэкенда:

```sh
pnpm --filter backend build               # production-сборка (dist/)
pnpm --filter backend test                # юнит-тесты (jest)
pnpm --filter backend lint                # eslint
pnpm --filter backend migration:generate  # сгенерировать миграцию из изменений entity
pnpm --filter backend migration:revert    # откатить последнюю миграцию
```