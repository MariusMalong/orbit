import { expect, test, type Page } from '@playwright/test';
import { deleteUser, prisma, signInAsNewUser } from './db';
import { quickAddSubmit, quickAddTitle } from './helpers';

let userId = '';

test.afterEach(async () => {
  await deleteUser(userId);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

const taskRow = (page: Page, title: string) =>
  page
    .getByRole('region', { name: 'Tasks' })
    .getByRole('listitem')
    .filter({ hasText: title });

test('make a project, put tasks in it, filter by it, and delete it', async ({
  page,
  baseURL,
}) => {
  userId = await signInAsNewUser(page.context(), baseURL!, {
    onboardedAt: new Date(),
    tasks: {
      create: [
        { title: 'Write report', durationEstimate: 60, priority: 2 },
        { title: 'Water plants', durationEstimate: 15, priority: 1 },
      ],
    },
  });
  await page.goto('/');

  // Add a project.
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Projects' });
  await dialog
    .getByRole('textbox', { name: 'New project name' })
    .fill('Thesis');
  await dialog.getByRole('button', { name: 'Add project' }).click();
  await expect(
    dialog.getByRole('textbox', { name: 'Name of Thesis' })
  ).toHaveValue('Thesis');
  await dialog.getByRole('button', { name: 'Done' }).click();

  // Put an existing task in it.
  await page.getByRole('button', { name: 'More for Write report' }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit task' });
  await edit.getByRole('combobox', { name: 'Project' }).selectOption('Thesis');
  await edit.getByRole('button', { name: 'Save' }).click();
  // The dialog sits inside the row, so wait for it to close before reading
  // the row: its project list says "Thesis" too.
  await expect(edit).toBeHidden();
  await expect(taskRow(page, 'Write report')).toContainText('Thesis');

  // And a new one, from the quick-add bar.
  await quickAddTitle(page).fill('Read chapter 2');
  await page
    .getByRole('form', { name: 'Quick add' })
    .getByRole('combobox', { name: 'Project' })
    .selectOption('Thesis');
  await quickAddSubmit(page).click();
  await expect(taskRow(page, 'Read chapter 2')).toContainText('Thesis');

  // Filtering shows only the project's tasks.
  await page
    .getByRole('navigation', { name: 'Filter tasks by project' })
    .getByRole('link', { name: 'Thesis' })
    .click();
  await expect(taskRow(page, 'Write report')).toBeVisible();
  await expect(taskRow(page, 'Water plants')).toHaveCount(0);

  // The Week page adds up the project's planned time.
  await page.goto('/week');
  const summary = page.getByRole('region', { name: 'Planned this week' });
  await expect(summary).toContainText('Thesis');
  await expect(summary).toContainText('No project');

  // Deleting the project keeps its tasks.
  await page.goto('/');
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await dialog.getByRole('button', { name: 'Delete Thesis' }).click();
  await expect(
    dialog.getByRole('textbox', { name: 'Name of Thesis' })
  ).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(taskRow(page, 'Write report')).toBeVisible();
  await expect(taskRow(page, 'Write report')).not.toContainText('Thesis');
  expect(await prisma.task.count({ where: { userId } })).toBe(3);
});
