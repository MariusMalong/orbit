import { expect, test } from '@playwright/test';
import { startDemo } from './helpers';

// When an action fails, Orbit shows its own error page with a way back,
// instead of the browser's blank "Application error".

test('a failed action shows the error page', async ({ page, context }) => {
  await startDemo(page);

  // Signed out behind the page's back (say, from another tab), so the next
  // action is turned down by the server.
  await context.clearCookies();
  await page
    .getByRole('button', { name: /^More for / })
    .first()
    .click();
  await page.getByRole('button', { name: 'Mark as done', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Something went wrong' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to Today' })).toBeVisible();

  // Trying again finds there's no session, so it's off to sign in.
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page).toHaveURL('/signin');
});
