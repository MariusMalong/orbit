import { describe, expect, it } from 'vitest';
import { buildExport, EXPORT_VERSION, type ExportInput } from './export';

const at = (iso: string) => new Date(iso);

const input: ExportInput = {
  user: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    image: null,
    isDemo: false,
    createdAt: at('2026-10-01T09:00:00Z'),
    accounts: [{ provider: 'github' }],
  },
  availabilities: [
    { dayOfWeek: 6, startTime: '09:00', endTime: '17:00', isDayOff: true },
    { dayOfWeek: 1, startTime: '08:30', endTime: '16:30', isDayOff: false },
  ],
  projects: [{ id: 'p1', name: 'Thesis', color: 'violet' }],
  tasks: [
    {
      id: 't1',
      title: 'Write chapter 1',
      description: null,
      priority: 3,
      durationEstimate: 90,
      deadline: at('2026-11-20T17:00:00Z'),
      plannedStart: null,
      status: 'IN_PROGRESS',
      completedAt: null,
      createdAt: at('2026-11-01T10:00:00Z'),
      projectId: 'p1',
      timeEntries: [
        {
          startTime: at('2026-11-02T10:00:00Z'),
          endTime: at('2026-11-02T10:30:00Z'),
          duration: 30,
        },
      ],
    },
  ],
  commitments: [
    {
      id: 'c1',
      title: 'Lecture',
      startTime: at('2026-11-03T10:00:00Z'),
      endTime: at('2026-11-03T11:00:00Z'),
      repeatsWeekly: true,
      skippedStarts: [at('2026-11-10T10:00:00Z')],
    },
  ],
};

describe('buildExport', () => {
  const result = buildExport(input, at('2026-11-08T12:00:00Z'));

  it('labels the file and the account', () => {
    expect(result.format).toBe('orbit-export');
    expect(result.version).toBe(EXPORT_VERSION);
    expect(result.exportedAt).toBe('2026-11-08T12:00:00.000Z');
    expect(result.account).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      image: null,
      demo: false,
      createdAt: '2026-10-01T09:00:00.000Z',
      signsInWith: ['github'],
    });
  });

  it('writes readable values: weekday names, priorities, project names', () => {
    expect(result.workingHours).toEqual([
      { day: 'Monday', start: '08:30', end: '16:30', dayOff: false },
      { day: 'Saturday', start: '09:00', end: '17:00', dayOff: true },
    ]);
    expect(result.tasks[0]).toMatchObject({
      priority: 'High',
      minutesLeft: 90,
      status: 'in progress',
      project: 'Thesis',
      deadline: '2026-11-20T17:00:00.000Z',
      timeLogged: [
        {
          start: '2026-11-02T10:00:00.000Z',
          end: '2026-11-02T10:30:00.000Z',
          minutes: 30,
        },
      ],
    });
    expect(result.events[0].skippedWeeks).toEqual(['2026-11-10T10:00:00.000Z']);
  });

  it('never copies fields it was not told to, like sign-in tokens', () => {
    const withSecrets = {
      ...input,
      user: {
        ...input.user,
        demoIpHash: 'SECRET-HASH',
        accounts: [{ provider: 'github', access_token: 'SECRET-TOKEN' }],
      },
    } as unknown as ExportInput;
    const json = JSON.stringify(buildExport(withSecrets, new Date()));
    expect(json).not.toContain('SECRET');
  });
});
