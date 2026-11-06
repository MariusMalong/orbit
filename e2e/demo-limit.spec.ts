import { expect, test } from '@playwright/test';

// Pretend to be one visitor, from an address in the documentation range.
// Locally nothing rewrites this header; on Vercel the platform sets it.
const visitor = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
test.use({ extraHTTPHeaders: { 'x-forwarded-for': visitor } });

test('stops one visitor starting too many demos', async ({ browser }) => {
  test.slow(); // Starts 11 demo accounts.

  const startOne = async () => {
    // A fresh browser context each time, like a visitor clearing cookies.
    const context = await browser.newContext({
      extraHTTPHeaders: { 'x-forwarded-for': visitor },
    });
    const page = await context.newPage();
    await page.goto('/signin');
    await page.getByRole('button', { name: 'Try the demo' }).click();
    await page.waitForURL(
      (url) => url.pathname !== '/signin' || url.search !== ''
    );
    return { page, context };
  };

  for (let i = 0; i < 10; i++) {
    const { page, context } = await startOne();
    await expect(page).toHaveURL('/');
    await context.close();
  }

  const { page, context } = await startOne();
  await expect(page).toHaveURL('/signin?demo=limited');
  await expect(page.getByRole('main').getByRole('status')).toContainText(
    'new ones are paused'
  );
  await context.close();
});
