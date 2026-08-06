import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Лёгкая (без загрузки полного Nuxt dev-сервера) конфигурация Vitest для
 * юнит-тестов чистых утилит (`app/utils`). Composables, зависящие от Nuxt
 * runtime (useRuntimeConfig и т.п.), в эти тесты не включаются.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/__tests__/**/*.test.ts']
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url))
    }
  }
})
