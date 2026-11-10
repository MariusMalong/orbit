import { expect, test, type Page } from '@playwright/test';
import { startDemo } from './helpers';

// The phone layout: a one-row header with a menu, Today and Week as tabs
// along the bottom, and a + button that opens the add form in a sheet.

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await startDemo(page);
});

const sheet = (page: Page) => page.getByRole('dialog', { name: 'Add' });

test('the header menu has the account, theme and sign-out', async ({
  page,
}) => {
  // The header's own Today / Week links and Sign out button are hidden.
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeHidden();

  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByText('Signed in as Demo visitor')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Theme: / })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  await page.getByRole('link', { name: 'Account', exact: true }).click();
  await expect(page).toHaveURL('/account');
  // The menu closes on the way.
  await expect(
    page.getByRole('link', { name: 'Account', exact: true })
  ).toBeHidden();
});

test('the bottom tabs switch between Today and Week', async ({ page }) => {
  const tabs = page.getByRole('navigation', { name: 'Views' });
  await expect(tabs.getByRole('link', { name: 'Today' })).toHaveAttribute(
    'aria-current',
    'page'
  );

  await tabs.getByRole('link', { name: 'Week' }).click();
  await expect(page).toHaveURL('/week');
  await expect(tabs.getByRole('link', { name: 'Week' })).toHaveAttribute(
    'aria-current',
    'page'
  );

  // Pinned to the bottom of the screen, even after scrolling.
  await page.mouse.wheel(0, 2000);
  const box = (await tabs.boundingBox())!;
  expect(box.y + box.height).toBeCloseTo(844, 0);
});

test('the + button adds a task from a sheet', async ({ page }) => {
  // The bar is hidden on a phone.
  await expect(page.getByRole('form', { name: 'Quick add' })).toBeHidden();

  await page.getByRole('button', { name: 'Add a task or event' }).click();
  await expect(sheet(page)).toBeVisible();
  // The title field is ready to type into.
  await expect(
    sheet(page).getByRole('textbox', { name: 'Task title' })
  ).toBeFocused();

  await page.keyboard.type('Buy stamps');
  await sheet(page).getByLabel('Time estimate').selectOption('15');
  await sheet(page).getByRole('button', { name: 'Add', exact: true }).click();

  await expect(sheet(page)).toBeHidden();
  const row = page
    .getByRole('region', { name: 'Tasks' })
    .getByRole('listitem')
    .filter({ hasText: 'Buy stamps' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('15 min');
});

test('Cancel closes the sheet without adding anything', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a task or event' }).click();
  await page.keyboard.type('Never mind');
  await sheet(page).getByRole('button', { name: 'Cancel' }).click();

  await expect(sheet(page)).toBeHidden();
  await expect(page.getByText('Never mind')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Add a task or event' })
  ).toBeFocused();
});

test('tapping free time on the timeline opens the sheet for an event', async ({
  page,
}) => {
  const hour = page
    .getByRole('region', { name: "Today's plan" })
    .getByRole('button', { name: /^Add event at / })
    .first();
  const time = (await hour.getAttribute('aria-label'))!.match(/\d\d:\d\d/)![0];
  await hour.click();

  await expect(sheet(page)).toBeVisible();
  await expect(
    sheet(page).getByRole('button', { name: 'Event', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet(page).getByLabel('Starts')).toHaveValue(time);

  // A name the demo doesn't use (it has a "Dentist appointment" some days).
  await page.keyboard.type('Plumber visit');
  await sheet(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(
    page
      .getByRole('region', { name: "Today's plan" })
      .getByText('Plumber visit', { exact: true })
  ).toBeVisible();
});
