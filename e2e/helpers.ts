import { expect, type Page } from '@playwright/test';

/**
 * Starts a fresh demo account and lands on Today. Every test gets its own
 * account, so tests can run in parallel and change anything.
 */
export async function startDemo(page: Page) {
  await page.goto('/signin');

  // The sign-in page saves the browser's timezone in a cookie, and the demo
  // is seeded in that timezone. Wait for it, so the plan matches the clock.
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((c) => c.name === 'tz')
    )
    .toBe(true);
  await page.reload();

  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL('/');
  await expect(
    page.getByRole('heading', { name: "Today's plan" })
  ).toBeVisible();
}

/** The quick-add bar's title field. */
export const quickAddTitle = (page: Page) =>
  page.getByRole('textbox', { name: /Task title|Event title/ });

/** The "Add" button on the quick-add bar. */
export const quickAddSubmit = (page: Page) =>
  page.getByRole('form', { name: 'Quick add' }).getByRole('button', {
    name: 'Add',
    exact: true,
  });

/** A date a number of days from today, as a date input expects it. */
export function daysFromToday(page: Page, days: number) {
  return page.evaluate((offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString('en-CA'); // "2026-11-09"
  }, days);
}
