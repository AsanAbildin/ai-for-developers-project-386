import { test as base, expect } from '@playwright/test';
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Корень монорепозитория, нужен как cwd для `pnpm --filter backend`.
 */
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Не удалось получить свободный порт')));
      }
    });
  });
}

async function waitForReady(baseUrl: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/event-types`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(
    `Backend на ${baseUrl} не поднялся за ${timeoutMs}ms: ${String(lastError)}`,
  );
}

export interface IsolatedBackendEnv {
  STORAGE_DRIVER?: 'memory' | 'postgres';
  [key: string]: string | undefined;
}

/**
 * Изолированный backend-процесс с полным контролем над жизненным циклом
 * (старт/стоп/рестарт), в отличие от общего backend из playwright.config.ts
 * webServer. Нужен для сценариев, которые проверяют поведение самого
 * процесса, а не только HTTP-контракт — например X-03 (сброс in-memory
 * хранилища при перезапуске сервиса). Используйте эту фикстуру и для любых
 * будущих сценариев такого рода (падение процесса, смена STORAGE_DRIVER,
 * изоляция между независимыми инстансами и т.п.) вместо написания
 * одноразового child_process-кода в конкретном тесте.
 */
export class IsolatedBackend {
  private process: ChildProcessWithoutNullStreams | null = null;
  readonly port: number;
  readonly baseUrl: string;
  private readonly env: IsolatedBackendEnv;

  private constructor(port: number, env: IsolatedBackendEnv) {
    this.port = port;
    this.baseUrl = `http://localhost:${port}`;
    this.env = env;
  }

  static async start(env: IsolatedBackendEnv = {}): Promise<IsolatedBackend> {
    const port = await getFreePort();
    const instance = new IsolatedBackend(port, {
      STORAGE_DRIVER: 'memory',
      ...env,
    });
    await instance.spawnProcess();
    return instance;
  }

  private async spawnProcess(): Promise<void> {
    this.process = spawn('pnpm', ['--filter', 'backend', 'start'], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PORT: String(this.port),
        ...this.env,
      },
      shell: process.platform === 'win32',
      // Изолируем процесс в собственную группу, чтобы stop() мог убить всю
      // группу (pnpm + вложенный node dist/main.js), а не только pnpm.
      detached: process.platform !== 'win32',
    });

    this.process.stdout.on('data', () => {});
    this.process.stderr.on('data', () => {});

    await waitForReady(this.baseUrl);
  }

  /** Останавливает процесс и ждёт его фактического завершения. */
  async stop(): Promise<void> {
    if (!this.process) return;
    const proc = this.process;
    this.process = null;
    await new Promise<void>((resolve) => {
      proc.once('exit', () => resolve());
      if (proc.pid) {
        try {
          // Убиваем всю группу процессов (pnpm + вложенный node), иначе
          // node dist/main.js переживает pnpm и продолжает держать порт.
          process.kill(-proc.pid, 'SIGTERM');
        } catch {
          proc.kill('SIGTERM');
        }
      }
      // На случай, если процесс не завершится сам по SIGTERM.
      setTimeout(() => {
        if (proc.pid) {
          try {
            process.kill(-proc.pid, 'SIGKILL');
          } catch {
            /* процесс уже завершился */
          }
        }
      }, 5_000).unref();
    });
  }

  /** Перезапускает процесс с теми же (или переданными) env — данные in-memory хранилища теряются. */
  async restart(env: IsolatedBackendEnv = this.env): Promise<void> {
    await this.stop();
    Object.assign(this.env, env);
    await this.spawnProcess();
  }
}

export const test = base.extend<{ isolatedBackend: IsolatedBackend }>({
  // eslint-disable-next-line no-empty-pattern
  isolatedBackend: async ({}, use) => {
    const backend = await IsolatedBackend.start();
    await use(backend);
    await backend.stop();
  },
});

export { expect };
