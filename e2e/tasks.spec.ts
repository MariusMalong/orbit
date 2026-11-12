import { expect, test } from '@playwright/test';
import { quickAddSubmit, quickAddTitle, startDemo } from './helpers';

test.beforeEach(async ({ page }) => {
  await startDemo(page);
});

const taskList = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Tasks' });

test('adds a task from the quick-add bar', async ({ page }) => {
  await quickAddTitle(page).fill('Call the bank');
  await page.getByLabel('Time estimate', { exact: true }).selectOption('45');
  await page.getByLabel('Priority', { exact: true }).selectOption('3');
  await quickAddSubmit(page).click();

  const row = taskList(page).getByRole('listitem').filter({
    hasText: 'Call the bank',
  });
  await expect(row).toBeVisible();
  await expect(row).toContainText('45 min');
  await expect(row.getByText(/^High\s*priority/)).toBeVisible();
  // The bar is cleared for the next task.
  await expect(quickAddTitle(page)).toHaveValue('');
});

test('marks a task as done from its menu', async ({ page }) => {
  // The second of the day's stats: tasks done.
  const summary = page
    .getByRole('region', { name: 'Today so far' })
    .getByRole('definition')
    .nth(1);
  await expect(summary).toHaveText('1 of 8');

  await page
    .getByRole('button', { name: 'More for Read the onboarding guide' })
    .click();
  await page.getByRole('button', { name: 'Mark as done', exact: true }).click();

  await expect(
    page.getByRole('button', { name: 'More for Read the onboarding guide' })
  ).toHaveCount(0);
  await expect(summary).toHaveText('2 of 8');
});

test('edits a task in the dialog', async ({ page }) => {
  await page
    .getByRole('button', { name: "More for Plan next week's budget" })
    .click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await dialog
    .getByLabel('Title', { exact: true })
    .fill('Plan the holiday budget');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(
    taskList(page).getByText('Plan the holiday budget')
  ).toBeVisible();
});

test('starts and stops a focus timer', async ({ page }) => {
  const summary = page.getByRole('region', { name: 'Today so far' });
  const before = await summary.innerText();

  await page
    .getByRole('button', {
      name: 'Start focus on Book flights for the conference',
    })
    .click();
  const stop = page.getByRole('button', {
    name: 'Stop focus on Book flights for the conference',
  });
  await expect(stop).toBeVisible();
  await stop.click();

  // A stopped session logs at least a minute, so the total goes up.
  await expect(summary).not.toHaveText(before);
  await expect(
    page.getByRole('button', {
      name: 'Start focus on Book flights for the conference',
    })
  ).toBeVisible();
});

test('a running focus timer survives leaving the page', async ({ page }) => {
  const task = 'Book flights for the conference';
  await page.getByRole('button', { name: `Start focus on ${task}` }).click();
  const stop = page.getByRole('button', { name: `Stop focus on ${task}` });
  await expect(stop).toBeVisible();
  await page.waitForLoadState('networkidle'); // The server has the timer

  // Off to the Week page and back, then a reload: still running.
  await page.getByRole('link', { name: 'Week', exact: true }).click();
  await expect(page).toHaveURL('/week');
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  await expect(stop).toBeVisible();
  await page.reload();
  await expect(stop).toBeVisible();

  await stop.click();
  await expect(
    page.getByRole('button', { name: `Start focus on ${task}` })
  ).toBeVisible();
  await page.reload();
  await expect(stop).toHaveCount(0);
});

test('marking a task done stops its focus timer', async ({ page }) => {
  const task = 'Book flights for the conference';
  await page.getByRole('button', { name: `Start focus on ${task}` }).click();
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: `More for ${task}` }).click();
  await page.getByRole('button', { name: 'Mark as done', exact: true }).click();
  await expect(
    page.getByRole('button', { name: `More for ${task}` })
  ).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByRole('button', { name: /^Stop focus on / })
  ).toHaveCount(0);
});
