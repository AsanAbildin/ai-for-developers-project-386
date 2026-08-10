import { defineEventHandler, proxyRequest } from 'h3'

/**
 * Проксирование /api/** с фронтенда на бэкенд (NestJS).
 *
 * Клиент и SSR обращаются к фронтенду по относительному /api
 * (см. NUXT_PUBLIC_API_BASE_URL=/api в Dockerfile), а этот обработчик
 * пересылает запрос на внутренний порт бэкенда. Целевой адрес задаётся через
 * API_PROXY_TARGET и переопределяется в docker/start.sh, чтобы не конфликтовать
 * с публичным портом PORT.
 */
export default defineEventHandler((event) => {
  const target = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3000'
  return proxyRequest(event, `${target}${event.node.req.url}`)
})
