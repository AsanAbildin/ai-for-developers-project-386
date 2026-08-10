import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Корень монорепозитория — нужен как cwd для `pnpm --filter backend|frontend`,
 * т.к. этот пакет (apps/e2e) сам не содержит backend/frontend кода.
 */
const REPO_ROOT = path.resolve(__dirname, '../..');

const BACKEND_PORT = 3000;
const FRONTEND_PORT = 3001;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Все тесты работают с одним общим backend (in-memory хранилище) и бронируют
  // один и тот же «первый свободный слот» — параллельные воркеры создавали бы
  // гонки (409 SLOT_UNAVAILABLE вместо 201, «чужие» записи в таблицах).
  // Сценарии с собственным backend (X-03) используют isolated-backend.ts.
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'html',
  timeout: 30_000,

  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Общий backend + frontend для большинства сценариев (G-xx, O-xx, X-01,
  // X-02, X-04, X-05, X-06, X-07). Сценарии, требующие полного контроля над
  // жизненным циклом backend-процесса (например X-03, перезапуск сервиса),
  // поднимают собственный изолированный инстанс через
  // fixtures/isolated-backend.ts и не используют этот webServer.
  webServer: [
    {
      command: 'pnpm --filter backend start',
      cwd: REPO_ROOT,
      url: `${BACKEND_URL}/api/event-types`,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(BACKEND_PORT),
        STORAGE_DRIVER: 'memory',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter frontend dev',
      cwd: REPO_ROOT,
      url: FRONTEND_URL,
      timeout: 90_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NUXT_PUBLIC_API_BASE_URL: `${BACKEND_URL}/api`,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
