#!/bin/sh
set -eu

# Публичный порт фронтенда (Nuxt SSR). Задаётся платформой (Render/Railway)
# или через `docker run -e PORT=...` при локальном запуске.
port="${PORT:-8080}"

# Внутренний порт бэкенда (NestJS). Если он совпадает с публичным PORT,
# сдвигаем, чтобы процессы не конкурировали за один порт.
backend_port="${BACKEND_PORT:-3000}"
if [ "$backend_port" = "$port" ]; then
  backend_port=3001
fi

export PORT="$port"
export STORAGE_DRIVER="${STORAGE_DRIVER:-memory}"
export API_PROXY_TARGET="http://127.0.0.1:${backend_port}"
# SSR-фетчи фронтенда ходят на бэкенд напрямую (клиентский bundle использует
# относительный /api и проксируется, см. server/routes/api).
export NUXT_API_BASE_URL_SERVER="http://127.0.0.1:${backend_port}/api"

# Бэкенд — в фоне, фронтенд (главный процесс) — в foreground, чтобы контейнер
# жил до тех пор, пока работает приложение.
PORT="$backend_port" node /app/backend/dist/main.js &
backend_pid=$!
trap 'kill "$backend_pid" 2>/dev/null || true' INT TERM EXIT

exec node /app/apps/frontend/.output/server/index.mjs
