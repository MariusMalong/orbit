import { expect, test } from '@playwright/test';
import { deleteUser, prisma, signInAsNewUser } from './db';

let userId = '';

test.afterEach(async () => {
  await deleteUser(userId);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('starts a task early for its deadline and says what moved', async ({
  page,
  context,
  baseURL,
}) => {
  // The browser is set to a timezone where it's mid-morning (see
  // playwright.config.ts). The essay is due at 10:00 the day after
  // tomorrow, which only leaves an hour that day, so 3 hours of it have to
  // happen tomorrow. That pushes the end of the high-priority work back a day.
  const deadline = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    date.setHours(10, 0, 0, 0);
    return date.toISOString();
  });

  userId = await signInAsNewUser(context, baseURL!, {
    onboardedAt: new Date(),
    availabilities: {
      create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
      })),
    },
    tasks: {
      create: [
        { title: 'Client project', durationEstimate: 820, priority: 3 },
        {
          title: 'Write the essay',
          durationEstimate: 240,
          priority: 1,
          deadline: new Date(deadline),
        },
      ],
    },
  });

  await page.goto('/week');
  const notice = page.getByRole('region', {
    name: 'Planned around your deadlines',
  });
  await expect(notice).toContainText(
    "Write the essay starts tomorrow, so it's done by"
  );
  await expect(notice).toContainText(
    'To make room, Client project now finishes'
  );
  await expect(notice).toContainText('instead of tomorrow');
  // And it isn't late.
  await expect(page.getByText("won't be done by")).toHaveCount(0);
});
