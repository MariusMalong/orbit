import { expect, test, type Page } from '@playwright/test';
import { deleteUser, signInAsNewUser } from './db';
import { startDemo } from './helpers';

// What a brand-new account sees on Today, and that motion follows the
// device's reduced-motion setting.

let userId = '';
test.afterEach(async () => {
  if (userId) await deleteUser(userId);
  userId = '';
});

async function openEmptyToday(page: Page, baseURL: string) {
  userId = await signInAsNewUser(page.context(), baseURL);
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page).toHaveURL('/');
}

const tasks = (page: Page) => page.getByRole('region', { name: 'Tasks' });

test('an empty task list offers to add a task', async ({ page, baseURL }) => {
  await openEmptyToday(page, baseURL!);

  await expect(tasks(page).getByText('No open tasks')).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: "Today's plan" })
      .getByText('Nothing planned for the rest of today')
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Today so far' }).getByRole('definition')
  ).toHaveText(['0m', '0 of 0', '0m']);

  // The button takes you to the quick-add bar, ready to type.
  await page.getByRole('button', { name: 'Event', exact: true }).click();
  await tasks(page).getByRole('button', { name: 'Add a task' }).click();
  await expect(page.getByRole('textbox', { name: 'Task title' })).toBeFocused();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('says the day is empty once, and the button opens the add sheet', async ({
    page,
    baseURL,
  }) => {
    await openEmptyToday(page, baseURL!);

    // The Now card says so; the timeline doesn't repeat it.
    await expect(page.getByText('Nothing else planned today')).toBeVisible();
    await expect(
      page.getByText('Nothing planned for the rest of today')
    ).toBeHidden();

    await page
      .getByRole('region', { name: 'Now' })
      .getByRole('button', { name: 'Add a task' })
      .click();
    const sheet = page.getByRole('dialog', { name: 'Add' });
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole('textbox', { name: 'Task title' })
    ).toBeFocused();
  });
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`dialogs ${reducedMotion === 'reduce' ? "don't animate" : 'animate in'} with reduced motion set to ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await startDemo(page);
    await page.goto('/week');
    await page
      .getByRole('button', { name: 'Change working hours and days off' })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Working hours' });
    await expect(dialog).toBeVisible();
    const animation = await dialog.evaluate(
      (el) => getComputedStyle(el).animationName
    );
    expect(animation).toBe(reducedMotion === 'reduce' ? 'none' : 'pop-in');
  });
}
