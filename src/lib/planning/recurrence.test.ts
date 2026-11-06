import { describe, expect, it } from 'vitest';
import {
  addSkippedStart,
  expandEvents,
  moveSeries,
  type StoredEvent,
} from './recurrence';

const MELBOURNE = 'Australia/Melbourne'; // +10, or +11 from 4 Oct 2026
const utc = (iso: string) => new Date(`${iso}Z`);

const event = (overrides: Partial<StoredEvent> = {}): StoredEvent => ({
  id: 'gym',
  title: 'Gym',
  // Tuesday 22 Sep 2026, 18:00–19:00 in Melbourne (+10)
  startTime: utc('2026-09-22T08:00:00'),
  endTime: utc('2026-09-22T09:00:00'),
  repeatsWeekly: true,
  skippedStarts: [],
  ...overrides,
});

describe('expandEvents', () => {
  it('keeps a one-off event only if it overlaps the range', () => {
    const oneOff = event({ repeatsWeekly: false });
    const inRange = expandEvents(
      [oneOff],
      utc('2026-09-22T00:00:00'),
      utc('2026-09-23T00:00:00'),
      MELBOURNE
    );
    const outOfRange = expandEvents(
      [oneOff],
      utc('2026-09-23T00:00:00'),
      utc('2026-09-30T00:00:00'),
      MELBOURNE
    );

    expect(inRange).toHaveLength(1);
    expect(inRange[0]).toMatchObject({ id: 'gym', repeatsWeekly: false });
    expect(outOfRange).toEqual([]);
  });

  it('repeats a weekly event once a week within the range', () => {
    // Three weeks later: Tue 13 Oct, after the clocks went forward on 4 Oct.
    const occurrences = expandEvents(
      [event()],
      utc('2026-10-11T13:00:00'), // Mon 12 Oct 00:00 in Melbourne
      utc('2026-10-25T13:00:00'), // Mon 26 Oct 00:00
      MELBOURNE
    );

    expect(occurrences.map((o) => o.start)).toEqual([
      utc('2026-10-13T07:00:00'), // Tue 13 Oct 18:00 (+11)
      utc('2026-10-20T07:00:00'), // Tue 20 Oct 18:00
    ]);
    expect(occurrences[0].end).toEqual(utc('2026-10-13T08:00:00'));
    expect(new Set(occurrences.map((o) => o.key)).size).toBe(2);
  });

  it('stays at the same clock time across a daylight-saving change', () => {
    const [before, after] = expandEvents(
      [event()],
      utc('2026-09-28T00:00:00'),
      utc('2026-10-07T00:00:00'),
      MELBOURNE
    );

    // Tue 29 Sep is +10 and Tue 6 Oct is +11, both at 18:00 local time.
    expect(before.start).toEqual(utc('2026-09-29T08:00:00'));
    expect(after.start).toEqual(utc('2026-10-06T07:00:00'));
  });

  it('never starts before the first occurrence', () => {
    const occurrences = expandEvents(
      [event()],
      utc('2026-09-01T00:00:00'),
      utc('2026-09-28T00:00:00'),
      MELBOURNE
    );
    expect(occurrences.map((o) => o.start)).toEqual([
      utc('2026-09-22T08:00:00'),
    ]);
  });

  it('leaves out skipped occurrences', () => {
    const occurrences = expandEvents(
      [event({ skippedStarts: [utc('2026-09-29T08:00:00')] })],
      utc('2026-09-21T00:00:00'),
      utc('2026-10-07T00:00:00'),
      MELBOURNE
    );
    expect(occurrences.map((o) => o.start)).toEqual([
      utc('2026-09-22T08:00:00'),
      utc('2026-10-06T07:00:00'),
    ]);
  });

  it('includes an occurrence that started before the range but is still on', () => {
    const occurrences = expandEvents(
      [event()],
      utc('2026-09-29T08:30:00'), // halfway through the 29 Sep session
      utc('2026-09-30T00:00:00'),
      MELBOURNE
    );
    expect(occurrences.map((o) => o.start)).toEqual([
      utc('2026-09-29T08:00:00'),
    ]);
  });

  it('sorts occurrences from several events by start', () => {
    const lecture = event({
      id: 'lecture',
      startTime: utc('2026-09-21T23:00:00'), // Tue 22 Sep 09:00
      endTime: utc('2026-09-22T01:00:00'),
    });
    const occurrences = expandEvents(
      [event(), lecture],
      utc('2026-09-21T14:00:00'),
      utc('2026-09-22T14:00:00'),
      MELBOURNE
    );
    expect(occurrences.map((o) => o.id)).toEqual(['lecture', 'gym']);
  });
});

describe('moveSeries', () => {
  it('moves every week by the change made to one occurrence', () => {
    // Editing Tue 6 Oct 18:00–19:00 to Wed 7 Oct 19:00–20:30.
    const moved = moveSeries(
      event(),
      utc('2026-10-06T07:00:00'),
      utc('2026-10-07T08:00:00'),
      utc('2026-10-07T09:30:00'),
      MELBOURNE
    );

    // The first occurrence becomes Wed 23 Sep 19:00 (+10), 90 minutes long.
    expect(moved.startTime).toEqual(utc('2026-09-23T09:00:00'));
    expect(moved.endTime).toEqual(utc('2026-09-23T10:30:00'));
  });

  it('keeps the series where it is when only the title changes', () => {
    const moved = moveSeries(
      event(),
      utc('2026-10-06T07:00:00'),
      utc('2026-10-06T07:00:00'),
      utc('2026-10-06T08:00:00'),
      MELBOURNE
    );
    expect(moved).toEqual({
      startTime: event().startTime,
      endTime: event().endTime,
    });
  });
});

describe('addSkippedStart', () => {
  const now = utc('2026-10-20T00:00:00');

  it('adds the new skip and drops ones that are long past', () => {
    expect(
      addSkippedStart(
        [utc('2026-09-29T08:00:00'), utc('2026-10-27T07:00:00')],
        utc('2026-10-20T07:00:00'),
        now
      )
    ).toEqual([utc('2026-10-20T07:00:00'), utc('2026-10-27T07:00:00')]);
  });

  it('keeps a skip from earlier today', () => {
    const earlierToday = utc('2026-10-19T22:00:00');
    expect(
      addSkippedStart([earlierToday], utc('2026-10-27T07:00:00'), now)
    ).toContainEqual(earlierToday);
  });

  it('does not add the same week twice', () => {
    const week = utc('2026-10-27T07:00:00');
    expect(addSkippedStart([week], week, now)).toEqual([week]);
  });
});
