import { expect, test } from '@playwright/test';
import { startDemo } from './helpers';

test('sends signed-out visitors to the sign-in page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/signin');
  await expect(
    page.getByRole('button', { name: 'Try the demo' })
  ).toBeVisible();

  await page.goto('/week');
  await expect(page).toHaveURL('/signin');
});

test('a demo account opens on a planned day', async ({ page }) => {
  await startDemo(page);

  await expect(page.getByText('Demo', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^More for / }).first()
  ).toBeVisible();
  // The timeline has planned work on it (blocks open a task menu).
  await expect(
    page.getByRole('button', { name: /Edit, mark as done or delete$/ }).first()
  ).toBeVisible();
  // The demo's team check-in repeats every week.
  await expect(
    page.getByRole('button', {
      name: /^Team check-in\b.*· Weekly\s*\.\s*Edit or delete$/,
    })
  ).toBeVisible();
});

test('the Week page shows seven days with the weekend off', async ({
  page,
}) => {
  await startDemo(page);
  await page.getByRole('link', { name: 'Week', exact: true }).click();
  await expect(page).toHaveURL('/week');

  const days = page.locator('ol > li[aria-label]');
  await expect(days).toHaveCount(7);
  // Saturday and Sunday are off, unless the demo started on one of them.
  await expect(days.filter({ hasText: 'Day off' }).first()).toBeVisible();
});
