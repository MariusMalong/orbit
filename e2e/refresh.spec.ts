import { expect, test, type Page } from '@playwright/test';
import { startDemo } from './helpers';

// Today redraws itself as time passes, so a page left open doesn't freeze at
// the moment it loaded. The browser's clock is faked to skip ahead.

/** Whether the page asks the server for a fresh render within a few seconds. */
async function refreshes(page: Page) {
  return page
    .waitForRequest((request) => request.headers()['rsc'] === '1', {
      timeout: 3_000,
    })
    .then(() => true)
    .catch(() => false);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await startDemo(page);
  await page.waitForLoadState('networkidle');
});

test('redraws Today once it is a few minutes old', async ({ page }) => {
  const redraw = refreshes(page);
  await page.clock.fastForward('06:00');
  expect(await redraw).toBe(true);
});

test("doesn't redraw while a dialog is open", async ({ page }) => {
  await page
    .getByRole('button', { name: /^More for / })
    .first()
    .click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const redraw = refreshes(page);
  await page.clock.fastForward('06:00');
  expect(await redraw).toBe(false);

  // Once it's closed, the next check catches up.
  await page.keyboard.press('Escape');
  const later = refreshes(page);
  await page.clock.fastForward('00:31');
  expect(await later).toBe(true);
});
