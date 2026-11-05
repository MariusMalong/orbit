import { describe, it, expect } from 'vitest';
import {
  atZonedTime,
  getZonedParts,
  isValidTimeZone,
  parseDateTimeLocal,
  startOfNextZonedDay,
  startOfZonedDay,
  zonedWallTimeToDate,
} from './zoned';

const MELBOURNE = 'Australia/Melbourne'; // +10, or +11 during daylight saving
const KOLKATA = 'Asia/Kolkata'; // +05:30, no daylight saving
const utc = (iso: string) => new Date(`${iso}Z`);
const HOUR_MS = 3_600_000;

describe('zonedWallTimeToDate', () => {
  it('converts a Melbourne summer time (+11) to the right instant', () => {
    expect(zonedWallTimeToDate(2026, 11, 6, 9, 0, MELBOURNE)).toEqual(
      utc('2026-11-05T22:00:00')
    );
  });

  it('converts a Melbourne winter time (+10) to the right instant', () => {
    expect(zonedWallTimeToDate(2026, 6, 15, 9, 0, MELBOURNE)).toEqual(
      utc('2026-06-14T23:00:00')
    );
  });

  it('handles half-hour offsets', () => {
    expect(zonedWallTimeToDate(2026, 11, 6, 9, 0, KOLKATA)).toEqual(
      utc('2026-11-06T03:30:00')
    );
  });

  it('leaves UTC times unchanged', () => {
    expect(zonedWallTimeToDate(2026, 11, 6, 9, 0, 'UTC')).toEqual(
      utc('2026-11-06T09:00:00')
    );
  });

  it('rolls an out-of-range day over into the next month', () => {
    expect(zonedWallTimeToDate(2026, 11, 31, 0, 0, MELBOURNE)).toEqual(
      zonedWallTimeToDate(2026, 12, 1, 0, 0, MELBOURNE)
    );
  });
});

describe('getZonedParts', () => {
  it("reports the visitor's date and weekday, not the server's", () => {
    // Thursday 22:00 in UTC is already Friday 09:00 in Melbourne.
    const instant = utc('2026-11-05T22:00:00');

    expect(getZonedParts(instant, 'UTC')).toMatchObject({
      day: 5,
      weekday: 4,
      hour: 22,
    });
    expect(getZonedParts(instant, MELBOURNE)).toMatchObject({
      day: 6,
      weekday: 5,
      hour: 9,
    });
  });
});

describe('atZonedTime', () => {
  it('sets the clock time on the same day in the given timezone', () => {
    const fridayMorningInMelbourne = utc('2026-11-05T22:00:00');

    expect(atZonedTime(fridayMorningInMelbourne, '17:00', MELBOURNE)).toEqual(
      utc('2026-11-06T06:00:00')
    );
  });
});

describe('startOfZonedDay / startOfNextZonedDay', () => {
  it("finds midnight in the visitor's timezone", () => {
    const instant = utc('2026-11-05T14:00:00'); // 01:00 on 6 Nov in Melbourne

    expect(startOfZonedDay(instant, MELBOURNE)).toEqual(
      utc('2026-11-05T13:00:00')
    );
    expect(startOfNextZonedDay(instant, MELBOURNE)).toEqual(
      utc('2026-11-06T13:00:00')
    );
  });

  it('gives a 23-hour day when daylight saving starts', () => {
    const dstStartDay = utc('2026-10-04T01:00:00'); // 4 Oct, clocks go forward

    const length =
      startOfNextZonedDay(dstStartDay, MELBOURNE).getTime() -
      startOfZonedDay(dstStartDay, MELBOURNE).getTime();

    expect(length).toBe(23 * HOUR_MS);
  });

  it('gives a 25-hour day when daylight saving ends', () => {
    const dstEndDay = utc('2026-04-05T01:00:00'); // 5 Apr, clocks go back

    const length =
      startOfNextZonedDay(dstEndDay, MELBOURNE).getTime() -
      startOfZonedDay(dstEndDay, MELBOURNE).getTime();

    expect(length).toBe(25 * HOUR_MS);
  });
});

describe('parseDateTimeLocal', () => {
  it('reads a datetime-local value as a time in the given timezone', () => {
    expect(parseDateTimeLocal('2026-11-06T12:30', MELBOURNE)).toEqual(
      utc('2026-11-06T01:30:00')
    );
  });

  it('accepts seconds', () => {
    expect(parseDateTimeLocal('2026-11-06T12:30:00', 'UTC')).toEqual(
      utc('2026-11-06T12:30:00')
    );
  });

  it('returns null for anything else', () => {
    expect(parseDateTimeLocal('', MELBOURNE)).toBeNull();
    expect(parseDateTimeLocal('2026-11-06', MELBOURNE)).toBeNull();
    expect(parseDateTimeLocal('not a date', MELBOURNE)).toBeNull();
  });
});

describe('isValidTimeZone', () => {
  it('accepts IANA names and rejects anything else', () => {
    expect(isValidTimeZone(MELBOURNE)).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});
