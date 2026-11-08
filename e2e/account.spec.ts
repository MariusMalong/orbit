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

test('downloading your data gives a JSON file of everything you added', async ({
  page,
  baseURL,
}) => {
  userId = await signInAsNewUser(page.context(), baseURL!, {
    onboardedAt: new Date(),
    projects: { create: [{ name: 'Thesis', color: 'violet' }] },
    availabilities: {
      create: [
        { dayOfWeek: 1, startTime: '08:30', endTime: '16:30', isDayOff: false },
      ],
    },
    commitments: {
      create: [
        {
          title: 'Lecture',
          startTime: new Date('2026-11-03T10:00:00Z'),
          endTime: new Date('2026-11-03T11:00:00Z'),
          repeatsWeekly: true,
        },
      ],
    },
    tasks: {
      create: [{ title: 'Write report', durationEstimate: 60, priority: 3 }],
    },
  });
  // Put the task in the project, as the app would.
  const project = await prisma.project.findFirstOrThrow({ where: { userId } });
  await prisma.task.updateMany({
    where: { userId },
    data: { projectId: project.id },
  });

  await page.goto('/account');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download my data' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(
    /^orbit-export-\d{4}-\d{2}-\d{2}\.json$/
  );

  const text = await (await file.createReadStream()).toArray();
  const data = JSON.parse(Buffer.concat(text).toString('utf8'));
  expect(data.format).toBe('orbit-export');
  expect(data.account.name).toBe('Ada Lovelace');
  expect(data.tasks).toEqual([
    expect.objectContaining({
      title: 'Write report',
      priority: 'High',
      project: 'Thesis',
    }),
  ]);
  expect(data.events[0]).toMatchObject({
    title: 'Lecture',
    repeatsWeekly: true,
  });
  expect(data.workingHours).toEqual([
    { day: 'Monday', start: '08:30', end: '16:30', dayOff: false },
  ]);
});

test('the data download needs you to be signed in', async ({ request }) => {
  const response = await request.get('/account/export');
  expect(response.status()).toBe(401);
});
