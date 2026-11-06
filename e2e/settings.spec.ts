import { expect, test } from '@playwright/test';
import { startDemo } from './helpers';

test.beforeEach(async ({ page }) => {
  await startDemo(page);
});

test('takes a day off in the working-hours editor', async ({ page }) => {
  await page.goto('/week');
  const days = page.locator('ol > li[aria-label]');
  const daysOff = days.filter({ hasText: 'Day off' });
  const before = await daysOff.count();

  await page
    .getByRole('button', { name: 'Change working hours and days off' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Working hours' });

  // Take off a workday that isn't today (the first column).
  const todayName = (await days.first().getAttribute('aria-label'))!.slice(
    0,
    3
  );
  const workdays = dialog.getByRole('checkbox', { checked: true });
  const count = await workdays.count();
  let target = '';
  for (let i = count - 1; i >= 0; i--) {
    const name = (await workdays.nth(i).getAttribute('id'))!;
    const label = await dialog.locator(`label[for="${name}"]`).innerText();
    if (!label.startsWith(todayName)) {
      target = label.trim();
      await workdays.nth(i).uncheck();
      break;
    }
  }
  expect(target).not.toBe('');

  await dialog.getByRole('button', { name: 'Save hours', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(daysOff).toHaveCount(before + 1);
});

test('rejects a workday that ends before it starts', async ({ page }) => {
  await page.goto('/week');
  await page
    .getByRole('button', { name: 'Change working hours and days off' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Working hours' });

  await dialog.getByLabel('Monday end').fill('08:00');
  await dialog.getByRole('button', { name: 'Save hours', exact: true }).click();

  await expect(dialog.getByRole('alert')).toHaveText(
    'Monday has to end after it starts.'
  );
  await expect(dialog).toBeVisible();
});

test('remembers the chosen theme', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /^Theme: / });
  const html = page.locator('html');

  await expect(toggle).toHaveAccessibleName(/^Theme: System/);
  await toggle.click(); // Light
  await expect(html).toHaveAttribute('data-theme', 'light');
  await toggle.click(); // Dark
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAccessibleName(/^Theme: Dark/);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('shows what to do now, with a focus button', async ({ page }) => {
    const card = page.locator('section[aria-labelledby="now-heading"]');
    await expect(card).toBeVisible();
    await expect(page.locator('#now-heading')).toHaveText(/^(Now|Next at)/);
    await expect(
      page.getByRole('heading', { name: 'After that' })
    ).toBeVisible();
  });
});
