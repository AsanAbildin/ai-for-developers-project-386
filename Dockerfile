# syntax=docker/dockerfile:1

# ===== База: Node.js + pnpm =====
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:/usr/local/bin:/usr/bin:/bin"
WORKDIR /app

# ===== Зависимости (слой кэшируется по lockfile) =====
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/e2e/package.json apps/e2e/package.json
COPY spec/package.json spec/package.json
RUN pnpm install --frozen-lockfile

# ===== Сборка =====
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=deps /app/apps/e2e/node_modules ./apps/e2e/node_modules
COPY --from=deps /app/spec/node_modules ./spec/node_modules
COPY . .

# Клиент и SSR бандлятся с относительным /api: браузер ходит на фронтенд,
# а тот проксирует /api на внутренний порт бэкенда (см. server/routes/api).
ENV NUXT_PUBLIC_API_BASE_URL=/api

RUN pnpm --filter scheduling-api-spec build
RUN pnpm --filter frontend generate:api-types
RUN pnpm --filter backend build
RUN pnpm --filter frontend build

# Оставляем только production-зависимости бэкенда (отдельная директория
# с собственным node_modules — без dev-зависимостей и без пост-установочных
# скриптов других пакетов воркспейса).
RUN pnpm --filter backend deploy --prod --legacy /app/backend-runtime \
  && cp -r apps/backend/dist /app/backend-runtime/dist

# ===== Runtime =====
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080 \
    STORAGE_DRIVER=memory \
    NUXT_PUBLIC_API_BASE_URL=/api

WORKDIR /app

# Production-зависимости бэкенда (отдельный корень с собственным node_modules).
COPY --from=build /app/backend-runtime ./backend

# Готовый сервер фронтенда (Nitro node-server).
COPY --from=build /app/apps/frontend/.output ./apps/frontend/.output

COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8080

CMD ["/app/start.sh"]
