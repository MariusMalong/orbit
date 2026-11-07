import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { startDemo } from './helpers';
import { deleteUser, signInAsNewUser } from './db';

// Automated accessibility checks (axe) on every page and dialog, in light
// and dark mode: colour contrast, labels, landmarks, ARIA use and more,
// against WCAG 2.1 AA. A failure lists each rule broken and where.

async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Next.js's development overlay button isn't part of the app.
    .exclude('nextjs-portal')
    .analyze();

  const report = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n` +
      v.nodes
        .slice(0, 5)
        .map(
          (n) =>
            `    ${n.target.join(' ')}\n      ${n.failureSummary?.split('\n').slice(1).join(' ')}`
        )
        .join('\n')
  );
  expect(report, report.join('\n\n')).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('sign-in page', async ({ page }) => {
      await page.goto('/signin');
      await expectAccessible(page);
    });

    test('privacy policy', async ({ page }) => {
      await page.goto('/privacy');
      await expectAccessible(page);
    });

    test('account page and the delete dialog', async ({ page }) => {
      await startDemo(page);
      await page.goto('/account');
      await expectAccessible(page);

      await page.getByRole('button', { name: 'Delete my account' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Delete your account?' })
      ).toBeVisible();
      await expectAccessible(page);
    });

    test('Today, with a task menu open', async ({ page }) => {
      await startDemo(page);
      await expectAccessible(page);

      await page
        .getByRole('button', { name: /^More for / })
        .first()
        .click();
      await expect(
        page.getByRole('button', { name: 'Mark as done', exact: true })
      ).toBeVisible();
      await expectAccessible(page);
    });

    test('edit dialogs', async ({ page }) => {
      await startDemo(page);

      await page
        .getByRole('button', { name: /^More for / })
        .first()
        .click();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Edit task' })
      ).toBeVisible();
      await expectAccessible(page);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: /^Team check-in\b/ }).click();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Edit event' })
      ).toBeVisible();
      await expectAccessible(page);
    });

    test('quick add in event mode', async ({ page }) => {
      await startDemo(page);
      await page.getByRole('button', { name: 'Event', exact: true }).click();
      await expectAccessible(page);
    });

    test('Week page and the working-hours dialog', async ({ page }) => {
      await startDemo(page);
      await page.goto('/week');
      await expectAccessible(page);

      await page
        .getByRole('button', { name: 'Change working hours and days off' })
        .click();
      await expect(
        page.getByRole('dialog', { name: 'Working hours' })
      ).toBeVisible();
      await expectAccessible(page);
    });

    test('Today on a phone', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await startDemo(page);
      await expectAccessible(page);
    });

    test('welcome page', async ({ page, context, baseURL }) => {
      const userId = await signInAsNewUser(context, baseURL!);
      try {
        await page.goto('/welcome');
        await expectAccessible(page);
      } finally {
        await deleteUser(userId);
      }
    });
  });
}
