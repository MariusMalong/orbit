import { expect, test } from '@playwright/test';
import {
  daysFromToday,
  quickAddSubmit,
  quickAddTitle,
  startDemo,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await startDemo(page);
});

test('adds a weekly event and deletes every week of it', async ({ page }) => {
  await page.getByRole('button', { name: 'Event', exact: true }).click();
  await quickAddTitle(page).fill('Gym');
  await page
    .getByLabel('Date', { exact: true })
    .fill(await daysFromToday(page, 2));
  await page.getByLabel('Starts', { exact: true }).fill('10:00');
  await page.getByLabel('Ends', { exact: true }).fill('11:00');
  await page.getByLabel('Every week', { exact: true }).check();
  await quickAddSubmit(page).click();

  await page.getByRole('link', { name: 'Week', exact: true }).click();
  const gym = page.getByRole('button', {
    name: /^10:00–11:00\s*Gym\s*· Weekly\. Edit or delete$/,
  });
  await expect(gym).toBeVisible();

  await gym.click();
  await page
    .getByRole('button', { name: 'Delete every week', exact: true })
    .click();
  await expect(gym).toHaveCount(0);
});

test('deletes only one week of a weekly event', async ({ page }) => {
  const checkIn = page.getByRole('button', { name: /^Team check-in\b/ });
  await expect(checkIn).toHaveCount(1);

  await checkIn.click();
  await expect(
    page.getByRole('button', { name: 'Delete every week', exact: true })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Delete this one', exact: true })
    .click();

  await expect(checkIn).toHaveCount(0);
});

test('moves every week of a weekly event', async ({ page }) => {
  await page.getByRole('button', { name: /^Team check-in\b/ }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Edit event' });
  await dialog.getByLabel('Every week', { exact: true }).check();
  await dialog.getByLabel('Event', { exact: true }).fill('Weekly sync');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();

  await expect(
    page.getByRole('button', {
      name: /^Weekly sync\b.*· Weekly\s*\.\s*Edit or delete$/,
    })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Team check-in\b/ })
  ).toHaveCount(0);
});

test('clicking an upcoming hour on the timeline starts an event there', async ({
  page,
}) => {
  const hour = page
    .getByRole('button', { name: /^Add event at \d\d:00$/ })
    .first();
  const label = (await hour.getAttribute('aria-label')) ?? '';
  const time = label.replace('Add event at ', '');

  await hour.click();

  await expect(
    page.getByRole('button', { name: 'Event', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Starts', { exact: true })).toHaveValue(time);
  await expect(quickAddTitle(page)).toBeFocused();
});
