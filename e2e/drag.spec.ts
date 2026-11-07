import { expect, test, type Locator, type Page } from '@playwright/test';
import { deleteUser, prisma, signInAsNewUser } from './db';

// Dragging a task to a new time on Today, or another day on the Week board,
// places it there. The browser is set to a timezone where it's mid-morning
// (see playwright.config.ts), so a 09:00-17:00 day has room either way.

let userId = '';

test.afterEach(async () => {
  await deleteUser(userId);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

/** Signs in a user with one hour-long task, every day 09:00-17:00 except `dayOff`. */
async function signInWithOneTask(
  page: Page,
  baseURL: string,
  dayOff: number | null = null
) {
  userId = await signInAsNewUser(page.context(), baseURL, {
    onboardedAt: new Date(),
    availabilities: {
      create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '09:00',
        endTime: dayOfWeek === dayOff ? '09:00' : '17:00',
        isDayOff: dayOfWeek === dayOff,
      })),
    },
    tasks: {
      create: [{ title: 'Write report', durationEstimate: 60, priority: 2 }],
    },
  });

  // Wait for the timezone cookie, so the plan is in the browser's timezone.
  await page.goto('/');
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((c) => c.name === 'tz')
    )
    .toBe(true);
}

/** Presses on `item`, moves the mouse by (dx, dy) in steps and lets go. */
async function drag(page: Page, item: Locator, dx: number, dy: number) {
  const box = (await item.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, 12);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}

const minutesOfDay = (text: string) => {
  const [, h, m] = /(\d{2}):(\d{2})/.exec(text)!;
  return Number(h) * 60 + Number(m);
};

test('dragging a task down the timeline places it later, until it is handed back', async ({
  page,
  baseURL,
}) => {
  await signInWithOneTask(page, baseURL!);
  await page.goto('/');

  const plan = page.getByRole('region', { name: "Today's plan" });
  const block = plan.getByRole('button', { name: /^Write report/ });
  const before = minutesOfDay((await block.textContent())!);

  // The timeline is 64px an hour, so this is 3 hours later.
  await drag(page, block, 0, 192);

  await expect(block).toContainText('Your time');
  const after = minutesOfDay((await block.textContent())!);
  expect(after - before).toBeGreaterThanOrEqual(165);
  expect(after - before).toBeLessThanOrEqual(195);
  expect(after % 15).toBe(0);

  // A drag isn't a click, so the menu didn't open.
  await expect(
    page.getByRole('button', { name: 'Let Orbit plan it' })
  ).toHaveCount(0);

  await block.click();
  await page.getByRole('button', { name: 'Let Orbit plan it' }).click();
  await expect(block).not.toContainText('Your time');
  expect(minutesOfDay((await block.textContent())!)).toBe(before);
});

test('dragging a task on the Week board moves it to another day, but not to a day off', async ({
  page,
  baseURL,
}) => {
  const tomorrow = await page.evaluate(() => (new Date().getDay() + 1) % 7);
  await signInWithOneTask(page, baseURL!, tomorrow);
  await page.goto('/week');

  const day = (i: number) => page.locator(`[data-day-index="${i}"]`);
  const task = (i: number) =>
    day(i).getByRole('button', {
      name: /^\d{2}:\d{2}.\d{2}:\d{2}\s*Write report/,
    });
  await expect(task(0)).toBeVisible();
  const time = minutesOfDay((await task(0).textContent())!);

  // Tomorrow is a day off, so dropping there leaves it where it was.
  const to = async (i: number) => {
    const from = (await task(0).boundingBox())!;
    const target = (await day(i).boundingBox())!;
    await drag(
      page,
      task(0),
      target.x + target.width / 2 - (from.x + from.width / 2),
      target.y + 120 - (from.y + 12)
    );
  };
  await to(1);
  await page.waitForLoadState('networkidle');
  const saved = await prisma.task.findFirstOrThrow({ where: { userId } });
  expect(saved.plannedStart).toBeNull();
  await expect(task(0)).toBeVisible();

  // The day after has room: the task moves there at the same time of day.
  await to(2);
  await expect(task(2)).toContainText('Your time');
  await expect(task(0)).toHaveCount(0);
  expect(minutesOfDay((await task(2).textContent())!)).toBe(time);
});
