import { describe, expect, it } from 'vitest';
import { movedStart, startOnDay } from './move';

const at = (iso: string) => new Date(iso);

describe('movedStart', () => {
  const earliest = at('2026-11-05T09:00:00Z');
  const latest = at('2026-11-05T17:00:00Z');

  it('moves by the dragged minutes and snaps to the quarter hour', () => {
    expect(
      movedStart(at('2026-11-05T10:00:00Z'), 55, earliest, latest)
    ).toEqual(at('2026-11-05T11:00:00Z'));
    expect(
      movedStart(at('2026-11-05T10:00:00Z'), -37, earliest, latest)
    ).toEqual(at('2026-11-05T09:30:00Z'));
  });

  it('does not move a block into the past', () => {
    const now = at('2026-11-05T11:05:00Z');
    expect(movedStart(at('2026-11-05T12:00:00Z'), -180, now, latest)).toEqual(
      at('2026-11-05T11:15:00Z')
    );
  });

  it('keeps at least a quarter hour before the end of the day', () => {
    expect(
      movedStart(at('2026-11-05T16:00:00Z'), 240, earliest, latest)
    ).toEqual(at('2026-11-05T16:45:00Z'));
  });
});

describe('startOnDay', () => {
  const timeZone = 'Europe/London';
  const friday = {
    date: at('2026-11-06T00:00:00Z'),
    start: at('2026-11-06T09:00:00Z'),
    end: at('2026-11-06T17:00:00Z'),
  };

  it('keeps the time of day when it is within the working hours', () => {
    expect(startOnDay(at('2026-11-05T14:30:00Z'), friday, timeZone)).toEqual(
      at('2026-11-06T14:30:00Z')
    );
  });

  it("uses the start of the day's hours otherwise", () => {
    expect(startOnDay(at('2026-11-05T08:00:00Z'), friday, timeZone)).toEqual(
      friday.start
    );
    expect(startOnDay(at('2026-11-05T17:00:00Z'), friday, timeZone)).toEqual(
      friday.start
    );
  });

  it('uses the time zone, not the server clock, for the time of day', () => {
    // 14:30 in New York is 19:30 UTC; Friday there runs 14:00-22:00 UTC.
    const ny = {
      date: at('2026-11-06T05:00:00Z'),
      start: at('2026-11-06T14:00:00Z'),
      end: at('2026-11-06T22:00:00Z'),
    };
    expect(
      startOnDay(at('2026-11-05T19:30:00Z'), ny, 'America/New_York')
    ).toEqual(at('2026-11-06T19:30:00Z'));
  });
});
