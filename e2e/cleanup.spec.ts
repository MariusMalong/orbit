import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { prisma } from './db';

// The daily cron job that deletes expired demo accounts. Vercel calls it with
// the project's CRON_SECRET; nobody else can.

const PATH = '/api/cron/cleanup-demos';

function demoUser(hoursOld: number) {
  return prisma.user.create({
    data: {
      name: 'Demo visitor',
      email: `demo-${randomUUID()}@demo.invalid`,
      isDemo: true,
      createdAt: new Date(Date.now() - hoursOld * 60 * 60 * 1000),
      tasks: {
        create: { title: 'Sample', durationEstimate: 30, priority: 2 },
      },
    },
  });
}

test('turns down calls without the secret', async ({ request }) => {
  expect((await request.get(PATH)).status()).toBe(401);
  const wrong = await request.get(PATH, {
    headers: { authorization: 'Bearer not-the-secret' },
  });
  expect(wrong.status()).toBe(401);
});

test('deletes demo accounts older than 24 hours, and only those', async ({
  request,
}) => {
  const expired = await demoUser(25);
  const fresh = await demoUser(1);
  try {
    const response = await request.get(PATH, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).deleted).toBeGreaterThanOrEqual(1);

    expect(
      await prisma.user.findUnique({ where: { id: expired.id } })
    ).toBeNull();
    // Its tasks went with it.
    expect(await prisma.task.count({ where: { userId: expired.id } })).toBe(0);
    expect(
      await prisma.user.findUnique({ where: { id: fresh.id } })
    ).not.toBeNull();
  } finally {
    await prisma.user.deleteMany({
      where: { id: { in: [expired.id, fresh.id] } },
    });
  }
});
