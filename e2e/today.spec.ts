import { expect, test } from '@playwright/test';
import { deleteUser, prisma, signInAsNewUser } from './db';

let userId = '';

test.afterEach(async () => {
  await deleteUser(userId);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('the timeline starts near now, with earlier hours a click away', async ({
  page,
  baseURL,
}) => {
  // It's mid-morning in the browser's timezone (see playwright.config.ts),
  // so a day from 06:00 is a few hours in, and the 06:30 call is over.
  const callStart = await page.evaluate(() => {
    const date = new Date();
    date.setHours(6, 30, 0, 0);
    return date.toISOString();
  });
  userId = await signInAsNewUser(page.context(), baseURL!, {
    onboardedAt: new Date(),
    availabilities: {
      create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '06:00',
        endTime: '17:00',
      })),
    },
    commitments: {
      create: [
        {
          title: 'Early call',
          startTime: new Date(callStart),
          endTime: new Date(new Date(callStart).getTime() + 30 * 60_000),
        },
      ],
    },
  });
  await page.goto('/');

  const plan = page.getByRole('region', { name: "Today's plan" });
  const call = plan.getByRole('button', { name: /^Early call/ });
  await expect(call).toHaveCount(0);

  await plan.getByRole('link', { name: 'Show earlier (from 06:00)' }).click();
  await expect(page).toHaveURL('/?earlier=1');
  await expect(call).toBeVisible();

  await plan.getByRole('link', { name: 'Hide earlier hours' }).click();
  await expect(call).toHaveCount(0);
});

test('late tasks come first on Today, with ways to deal with them', async ({
  page,
  baseURL,
}) => {
  // Ten hours of work due in two hours can't make it.
  userId = await signInAsNewUser(page.context(), baseURL!, {
    onboardedAt: new Date(),
    tasks: {
      create: [
        {
          title: 'Submit the grant application',
          durationEstimate: 600,
          priority: 2,
          deadline: new Date(Date.now() + 2 * 3_600_000),
        },
      ],
    },
  });
  await page.goto('/');

  const late = page.getByRole('region', { name: /won't make/ });
  await expect(late).toContainText(
    "Submit the grant application won't be done by"
  );

  // It's above the plan.
  const lateBox = (await late.boundingBox())!;
  const planBox = (await page
    .getByRole('region', { name: "Today's plan" })
    .boundingBox())!;
  expect(lateBox.y).toBeLessThan(planBox.y);

  // "Change task" opens the edit dialog for it.
  await late
    .getByRole('button', {
      name: /Change task\s*: Submit the grant application/,
    })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Edit task' });
  await expect(dialog.getByRole('textbox', { name: 'Title' })).toHaveValue(
    'Submit the grant application'
  );
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  // Marking it done clears the warning.
  await late
    .getByRole('button', {
      name: /Mark as done\s*: Submit the grant application/,
    })
    .click();
  await expect(page.getByRole('region', { name: /won't make/ })).toHaveCount(0);
});
