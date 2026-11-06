import { describe, it, expect } from 'vitest';
import { buildPlanningDays } from './days';
import { generateMultiDaySchedule } from '@/lib/engine/multi-day';

const MELBOURNE = 'Australia/Melbourne';
const utc = (iso: string) => new Date(`${iso}Z`);

// Friday 6 November, 11:02 in Melbourne (+11).
const now = utc('2026-11-06T00:02:00');

describe('buildPlanningDays', () => {
  it("builds 7 days from today in the visitor's timezone", () => {
    const days = buildPlanningDays(now, MELBOURNE, {});

    expect(days).toHaveLength(7);
    expect(days.map((d) => d.weekday)).toEqual([5, 6, 0, 1, 2, 3, 4]);
    expect(days[1].date).toEqual(utc('2026-11-06T13:00:00')); // Sat 00:00
  });

  it('starts today from now, rounded up, and later days at the start of work', () => {
    const days = buildPlanningDays(now, MELBOURNE, {});

    expect(days[0].workDayStart).toEqual(utc('2026-11-05T22:00:00')); // 09:00
    expect(days[0].start).toEqual(utc('2026-11-06T00:05:00')); // 11:05
    expect(days[1].start).toEqual(utc('2026-11-06T22:00:00')); // Sat 09:00
  });

  it('uses each weekday’s own hours, and 09:00–17:00 for the rest', () => {
    const days = buildPlanningDays(now, MELBOURNE, {
      6: { startTime: '10:00', endTime: '14:00' }, // Saturday
    });

    expect(days[1].start).toEqual(utc('2026-11-06T23:00:00')); // Sat 10:00
    expect(days[1].end).toEqual(utc('2026-11-07T03:00:00')); // Sat 14:00
    expect(days[2].hours).toEqual({ startTime: '09:00', endTime: '17:00' });
  });

  it('marks each day urgent until its own midnight', () => {
    const days = buildPlanningDays(now, MELBOURNE, {});

    for (let i = 0; i < days.length - 1; i++) {
      expect(days[i].urgentUntil).toEqual(days[i + 1].date);
    }
  });

  it('rolls over into the next month', () => {
    const endOfMonth = utc('2026-11-29T23:00:00'); // Mon 30 Nov, 10:00

    const days = buildPlanningDays(endOfMonth, MELBOURNE, {});

    expect(days[1].date).toEqual(utc('2026-11-30T13:00:00')); // Tue 1 Dec
  });

  it('keeps working hours right across a daylight-saving change', () => {
    // Saturday 3 Oct 2026; clocks go forward early on Sunday 4 Oct.
    const days = buildPlanningDays(utc('2026-10-02T23:00:00'), MELBOURNE, {});

    expect(days[0].workDayStart).toEqual(utc('2026-10-02T23:00:00')); // Sat 09:00 (+10)
    expect(days[1].workDayStart).toEqual(utc('2026-10-03T22:00:00')); // Sun 09:00 (+11)
  });

  it('gives a day off no planning time but keeps its hours', () => {
    const days = buildPlanningDays(now, MELBOURNE, {
      6: { startTime: '10:00', endTime: '14:00', isDayOff: true }, // Saturday
    });

    expect(days[1].isDayOff).toBe(true);
    expect(days[1].end).toEqual(days[1].start);
    expect(days[1].workDayEnd).toEqual(utc('2026-11-07T03:00:00')); // Sat 14:00
    expect(days[1].hours.startTime).toBe('10:00');
    expect(days[2].isDayOff).toBe(false);
  });

  it('leaves nothing planned on days off', () => {
    const days = buildPlanningDays(now, MELBOURNE, {
      6: { startTime: '09:00', endTime: '17:00', isDayOff: true },
      0: { startTime: '09:00', endTime: '17:00', isDayOff: true },
    });
    const plan = generateMultiDaySchedule(
      [{ id: 'big', title: 'Big job', durationEstimate: 900, priority: 2 }],
      [],
      days
    );

    const usedDays = new Set(plan.scheduledBlocks.map((b) => b.dayIndex));
    expect(usedDays.has(1)).toBe(false); // Saturday
    expect(usedDays.has(2)).toBe(false); // Sunday
    expect(usedDays.has(3)).toBe(true); // Monday picks up the rest
  });
});
