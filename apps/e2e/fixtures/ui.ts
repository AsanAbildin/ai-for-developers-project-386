import type { Page } from '@playwright/test';

/**
 * Общие UI-хелперы поверх data-testid, добавленных в компоненты фронтенда
 * специально для устойчивых Playwright-селекторов (см.
 * apps/frontend/app/pages/**\/*.vue).
 */

/**
 * Ждёт завершения гидратации Nuxt-приложения (маркер data-hydrated="true"
 * выставляется в app.vue в onMounted). Без этого клики по SSR-разметке могут
 * попадать в статичный DOM, где Vue-обработчики ещё не навешаны.
 */
export async function waitForHydration(page: Page) {
  await page
    .locator('[data-hydrated="true"]')
    .waitFor({ state: 'attached', timeout: 15_000 });
}

export async function gotoBookingPage(page: Page, eventTypeId: string) {
  await page.goto(`/book/${eventTypeId}`);
  await waitForHydration(page);
  await page.getByTestId('booking-event-type-name').waitFor({ state: 'visible' });
}

/**
 * Выбирает первый день, на который есть хотя бы один свободный слот, и
 * кликает по первому доступному слоту. Возвращает locator выбранной кнопки
 * слота (уже в состоянии "solid"/selected).
 */
export async function selectFirstAvailableSlot(page: Page) {
  const dayButtons = page.getByTestId('day-button');
  const dayCount = await dayButtons.count();

  for (let i = 0; i < dayCount; i++) {
    await dayButtons.nth(i).click();
    const slotEmpty = page.getByTestId('slots-empty');
    const slotList = page.getByTestId('slot-list');
    await Promise.race([
      slotEmpty.waitFor({ state: 'visible' }).catch(() => {}),
      slotList.waitFor({ state: 'visible' }).catch(() => {}),
    ]);
    if (await slotList.isVisible()) {
      const firstSlot = page.getByTestId('slot-button').first();
      await firstSlot.click();
      return firstSlot;
    }
  }

  throw new Error('Не удалось найти ни одного свободного слота в окне 14 дней');
}

export async function fillGuestForm(page: Page, name: string, email: string) {
  await page.getByTestId('guest-name-input').fill(name);
  await page.getByTestId('guest-email-input').fill(email);
}

export async function submitBookingForm(page: Page) {
  await page.getByTestId('submit-booking-button').click();
}

export async function getCancellationToken(page: Page): Promise<string> {
  const el = page.getByTestId('cancellation-token');
  await el.waitFor({ state: 'visible' });
  const token = await el.getAttribute('data-cancellation-token');
  if (!token) throw new Error('cancellationToken не найден в DOM');
  return token;
}

export async function bookFirstAvailableSlot(
  page: Page,
  eventTypeId: string,
  guestName: string,
  guestEmail: string,
) {
  await gotoBookingPage(page, eventTypeId);
  const slotButton = await selectFirstAvailableSlot(page);
  const slotStartTime = await slotButton.getAttribute('data-slot-start-time');
  await fillGuestForm(page, guestName, guestEmail);
  await submitBookingForm(page);
  await page.getByTestId('booking-confirmation').waitFor({ state: 'visible' });
  const cancellationToken = await getCancellationToken(page);
  return { slotStartTime, cancellationToken };
}
