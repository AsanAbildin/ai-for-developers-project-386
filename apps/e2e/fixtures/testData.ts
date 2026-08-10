import { randomUUID } from 'node:crypto';

/**
 * Генераторы уникальных тестовых данных. Backend работает с общим in-memory
 * хранилищем на весь прогон (см. playwright.config.ts), поэтому тесты не
 * сбрасывают состояние между собой — вместо этого каждый тест создаёт свои
 * уникальные сущности (типы событий, гостей), чтобы не пересекаться с
 * данными других тестов.
 */

let counter = 0;

function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}-${randomUUID().slice(0, 8)}`;
}

export function uniqueEventTypeName(prefix = 'E2E Тип события'): string {
  return `${prefix} ${uniqueSuffix()}`;
}

export function uniqueGuestName(prefix = 'E2E Гость'): string {
  return `${prefix} ${uniqueSuffix()}`;
}

export function uniqueGuestEmail(): string {
  return `e2e.${uniqueSuffix()}@example.com`;
}

export interface EventTypeInput {
  name: string;
  description: string;
  durationMinutes: number;
}

export function buildEventTypeInput(
  overrides: Partial<EventTypeInput> = {},
): EventTypeInput {
  return {
    name: uniqueEventTypeName(),
    description: 'Тип события, созданный автотестом Playwright',
    durationMinutes: 30,
    ...overrides,
  };
}
