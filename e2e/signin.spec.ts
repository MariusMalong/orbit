import { expect, test } from '@playwright/test';

test('offers GitHub sign-in, and Google only when it is configured', async ({
  page,
}) => {
  await page.goto('/signin');
  await expect(
    page.getByRole('button', { name: 'Sign in with GitHub' })
  ).toBeVisible();
  // The test server has no Google OAuth client.
  await expect(
    page.getByRole('button', { name: 'Sign in with Google' })
  ).toHaveCount(0);
});

test('explains a sign-in with an email that is already used', async ({
  page,
}) => {
  await page.goto('/signin?error=OAuthAccountNotLinked');
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    /already used by an Orbit account that signs in another way/
  );
});

test('shows a general message for other sign-in errors', async ({ page }) => {
  await page.goto('/signin?error=Configuration');
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    /Something went wrong while signing in/
  );
});
