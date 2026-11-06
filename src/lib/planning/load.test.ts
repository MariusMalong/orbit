import { describe, expect, it } from 'vitest';
import { dayLoads } from './load';

const at = (hhmm: string, day = 9) =>
  new Date(`2026-11-${String(day).padStart(2, '0')}T${hhmm}:00Z`);

const monday = {
  start: at('09:00'),
  end: at('17:00'),
  urgentUntil: at('00:00', 10),
};
const tuesday = {
  start: at('09:00', 10),
  end: at('17:00', 10),
  urgentUntil: at('00:00', 11),
};

describe('dayLoads', () => {
  it('is empty for a day with nothing on it', () => {
    expect(dayLoads([monday], [], [])).toEqual([
      { busyMinutes: 0, capacityMinutes: 480, percent: 0 },
    ]);
  });

  it('adds planned work and commitments on the same day', () => {
    const [load] = dayLoads(
      [monday],
      [{ start: at('09:00'), end: at('11:00'), dayIndex: 0 }],
      [{ start: at('12:00'), end: at('13:00') }]
    );
    expect(load).toEqual({
      busyMinutes: 180,
      capacityMinutes: 480,
      percent: 38,
    });
  });

  it('only counts blocks on their own day', () => {
    const loads = dayLoads(
      [monday, tuesday],
      [
        { start: at('09:00'), end: at('10:00'), dayIndex: 0 },
        { start: at('09:00', 10), end: at('13:00', 10), dayIndex: 1 },
      ],
      []
    );
    expect(loads.map((l) => l.busyMinutes)).toEqual([60, 240]);
  });

  it('clips commitments to the working hours', () => {
    const [load] = dayLoads(
      [monday],
      [],
      [
        { start: at('08:00'), end: at('10:00') },
        { start: at('16:30'), end: at('19:00') },
        { start: at('19:00'), end: at('20:00') },
      ]
    );
    expect(load.busyMinutes).toBe(90);
  });

  it('counts overlapping commitments once', () => {
    const [load] = dayLoads(
      [monday],
      [],
      [
        { start: at('10:00'), end: at('12:00') },
        { start: at('11:00'), end: at('13:00') },
        { start: at('11:30'), end: at('11:45') },
      ]
    );
    expect(load.busyMinutes).toBe(180);
  });

  it('caps at 100 and treats a day with no time left as full', () => {
    const over = { ...monday, start: at('17:00') };
    expect(dayLoads([over], [], [])[0]).toEqual({
      busyMinutes: 0,
      capacityMinutes: 0,
      percent: 100,
    });

    const [full] = dayLoads(
      [monday],
      [],
      [{ start: at('08:00'), end: at('18:00') }]
    );
    expect(full.percent).toBe(100);
  });
});
