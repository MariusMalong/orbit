import { expect, test, type Page } from '@playwright/test';
import { startDemo } from './helpers';

// Marking a task done or deleting it happens at once, with an Undo button in
// a message at the bottom of the screen.

const TASK = 'Read the onboarding guide';

test.beforeEach(async ({ page }) => {
  await startDemo(page);
});

const taskRow = (page: Page) =>
  page
    .getByRole('region', { name: 'Tasks' })
    .getByRole('listitem')
    .filter({ hasText: TASK });

async function fromMenu(page: Page, item: 'Mark as done' | 'Delete') {
  await page.getByRole('button', { name: `More for ${TASK}` }).click();
  await page.getByRole('button', { name: item, exact: true }).click();
}

const toast = (page: Page) => page.getByRole('status', { name: 'Undo' });
const undo = (page: Page) => toast(page).getByRole('button', { name: 'Undo' });

test('undoes Mark as done', async ({ page }) => {
  await fromMenu(page, 'Mark as done');
  await expect(taskRow(page)).toHaveCount(0);
  await expect(toast(page)).toContainText(`Marked “${TASK}” as done`);

  await undo(page).click();
  await expect(taskRow(page)).toBeVisible();
  await expect(undo(page)).toHaveCount(0);
  // Back to 1 of 8 done.
  await expect(
    page
      .getByRole('region', { name: 'Today so far' })
      .getByRole('definition')
      .nth(1)
  ).toHaveText('1 of 8');
});

test('undoes Delete', async ({ page }) => {
  await fromMenu(page, 'Delete');
  await expect(taskRow(page)).toHaveCount(0);
  await expect(toast(page)).toContainText(`Deleted “${TASK}”`);

  await undo(page).click();
  await expect(taskRow(page)).toBeVisible();
  await page.reload();
  await expect(taskRow(page)).toBeVisible();
});

test('without Undo, a deleted task stays gone', async ({ page }) => {
  await fromMenu(page, 'Delete');
  await page
    .getByRole('status')
    .getByRole('button', { name: 'Dismiss' })
    .click();
  await expect(undo(page)).toHaveCount(0);
  await page.reload();
  await expect(taskRow(page)).toHaveCount(0);
});

test('the message goes by itself, but not while the pointer is on it', async ({
  page,
}) => {
  await page.clock.install();
  await page.reload();
  await fromMenu(page, 'Mark as done');
  await expect(undo(page)).toBeVisible();

  await undo(page).hover();
  await page.clock.fastForward('00:10');
  await expect(undo(page)).toBeVisible();

  await page.mouse.move(0, 0);
  await page.clock.fastForward('00:09');
  await expect(undo(page)).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the Now card's Done can be undone", async ({ page }) => {
    const now = page.getByRole('region', { name: /^(Now|Next at)/ });
    const title = await now.getByRole('heading').first().innerText();
    await now.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(toast(page)).toContainText(`Marked “${title}” as done`);
    await undo(page).click();
    await expect(now.getByRole('heading', { name: title })).toBeVisible();
  });
});
