import { expect, test } from '@playwright/test';
import { deleteUser, prisma, signInAsNewUser } from './db';

let userId = '';

test.afterEach(async () => {
  await deleteUser(userId);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('the privacy policy is public and linked from every page', async ({
  page,
}) => {
  await page.goto('/signin');
  await page.getByRole('link', { name: 'Privacy policy' }).click();
  await expect(page).toHaveURL('/privacy');
  await expect(
    page.getByRole('heading', { name: 'Privacy policy', level: 1 })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'mariusmalong@gmail.com' })
  ).toBeVisible();
});

test('the account page is only for signed-in users', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL('/signin');
});

test('deleting your account removes everything and signs you out', async ({
  page,
  baseURL,
}) => {
  userId = await signInAsNewUser(page.context(), baseURL!, {
    onboardedAt: new Date(),
    tasks: {
      create: [{ title: 'Write report', durationEstimate: 60, priority: 2 }],
    },
  });

  // The name in the header leads to the account page.
  await page.goto('/');
  await page.getByRole('link', { name: /^Ada Lovelace/ }).click();
  await expect(page).toHaveURL('/account');

  // Cancelling keeps everything.
  await page.getByRole('button', { name: 'Delete my account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete your account?' });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(await prisma.user.count({ where: { id: userId } })).toBe(1);

  await page.getByRole('button', { name: 'Delete my account' }).click();
  await dialog.getByRole('button', { name: 'Delete everything' }).click();

  await expect(page).toHaveURL('/signin?deleted=1');
  await expect(page.getByRole('main').getByRole('status')).toHaveText(
    'Your account and everything in it have been deleted.'
  );
  expect(await prisma.user.count({ where: { id: userId } })).toBe(0);
  expect(await prisma.task.count({ where: { userId } })).toBe(0);

  // Signed out: the app sends you back to sign in.
  await page.goto('/');
  await expect(page).toHaveURL('/signin');
});
