import { expect, test } from '@playwright/test';
import { deleteUser, prisma, signInAsNewUser } from './db';

let userId = '';

test.beforeEach(async ({ context, baseURL }) => {
  userId = await signInAsNewUser(context, baseURL!);
});

test.afterEach(async () => {
  await deleteUser(userId);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('sends a new account to the welcome page first', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/welcome');
  await expect(
    page.getByRole('heading', { name: 'Welcome to Orbit, Ada' })
  ).toBeVisible();

  await page.goto('/week');
  await expect(page).toHaveURL('/welcome');
});

test('sets up working hours and first tasks', async ({ page }) => {
  await page.goto('/welcome');

  // Weekdays are suggested as workdays, the weekend as days off.
  await expect(page.getByRole('checkbox', { name: 'Monday' })).toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Saturday' })
  ).not.toBeChecked();

  await page.getByRole('checkbox', { name: 'Friday' }).uncheck();
  await page.getByLabel('Task 1', { exact: true }).fill('Write the report');
  await page.getByLabel('Task 1 estimate').selectOption('90');
  await page.getByLabel('Task 2', { exact: true }).fill('Call the bank');
  await page.getByRole('button', { name: 'Start planning' }).click();

  await expect(page).toHaveURL('/');
  const tasks = page.getByRole('region', { name: 'Tasks' });
  await expect(tasks.getByText('Write the report')).toBeVisible();
  await expect(tasks.getByText('Call the bank')).toBeVisible();

  // Friday and the weekend are now days off.
  const hours = await prisma.availability.findMany({
    where: { userId, isDayOff: true },
    orderBy: { dayOfWeek: 'asc' },
  });
  expect(hours.map((h) => h.dayOfWeek)).toEqual([0, 5, 6]);

  // Once set up, the welcome page sends you on to Today.
  await page.goto('/welcome');
  await expect(page).toHaveURL('/');
});

test('shows a mistake in the hours instead of saving', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByLabel('Monday end').fill('08:00');
  await page.getByRole('button', { name: 'Start planning' }).click();

  // Scoped to <main>: Next.js adds its own hidden role="alert" route announcer.
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'Monday has to end after it starts.'
  );
  await expect(page).toHaveURL('/welcome');
});

test('can be skipped', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Skip for now' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByText('No open tasks', { exact: true })).toBeVisible();
});
