import { test, expect } from '@playwright/test';
import { createEventType } from '../fixtures/api';
import { buildEventTypeInput, uniqueGuestEmail, uniqueGuestName } from '../fixtures/testData';
import { gotoBookingPage, selectFirstAvailableSlot, fillGuestForm, submitBookingForm, waitForHydration } from '../fixtures/ui';

/**
 * X-04: backend недоступен/возвращает 5xx — UI не должен падать с
 * необработанным исключением, должен показывать понятную ошибку.
 * Симулируем недоступность через перехват сетевых запросов (page.route),
 * не трогая реальный backend-процесс, который используют остальные тесты.
 *
 * Важно: page.route перехватывает запросы браузера, а не серверного процесса
 * Nuxt (SSR-фетчи `useAsyncData`). Поэтому сценарии, где ошибка должна
 * проявиться на SSR-странице, используют клиентскую навигацию: сначала
 * открываем любую страницу, ставим перехват и уходим на целевую страницу
 * клиентским переходом — тогда данные фетчатся уже в браузере.
 */

test.describe('X-04: обработка сетевых ошибок на фронтенде', () => {
  test('главная страница показывает ошибку и кнопку повтора при 500 от API', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());

    // Прямой заход на "/" фетчит event-types на сервере, где page.route не
    // работает. Заходим на страницу бронирования (с неё ведёт ссылка домой),
    // ставим перехват и уходим на главную клиентской навигацией.
    await gotoBookingPage(page, eventType.id);

    await page.route('**/api/event-types', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка' }),
      }),
    );

    await page.getByRole('link', { name: 'Ко всем типам событий' }).click();

    await expect(page.getByTestId('event-types-error')).toBeVisible();
    await expect(page.getByTestId('event-types-retry-button')).toBeVisible();
  });

  test('страница бронирования показывает ошибку при недоступности API слотов', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());

    // То же самое для слотов: перехват ставим ДО клиентского перехода на
    // страницу бронирования с главной.
    await page.goto('/');
    await waitForHydration(page);

    await page.route('**/api/event-types/*/slots', (route) => route.abort('failed'));

    const card = page.getByTestId('event-type-card').filter({
      has: page.getByTestId('event-type-name').getByText(eventType.name, { exact: true }),
    });
    await card.getByTestId('book-button').click();

    await expect(page.getByTestId('slots-error')).toBeVisible();
  });

  test('ошибка сети при отправке бронирования не роняет UI и показывает тост', async ({
    page,
    request,
  }) => {
    const eventType = await createEventType(request, buildEventTypeInput());

    await gotoBookingPage(page, eventType.id);
    await selectFirstAvailableSlot(page);
    await fillGuestForm(page, uniqueGuestName(), uniqueGuestEmail());

    await page.route('**/api/bookings', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Что-то пошло не так' }),
        });
      }
      return route.continue();
    });

    await submitBookingForm(page);

    // Подтверждения бронирования быть не должно, форма остаётся доступной.
    await expect(page.getByTestId('booking-confirmation')).not.toBeVisible();
    await expect(page.getByTestId('booking-form')).toBeVisible();
  });
});
