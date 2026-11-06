import { describe, expect, it } from 'vitest';
import { formatDayRange } from './format';

const MELBOURNE = 'Australia/Melbourne';
// Midnight in Melbourne (+11) is 13:00 UTC the day before.
const midnight = (iso: string) => new Date(`${iso}T13:00:00Z`);

describe('formatDayRange', () => {
  it('names the month once for days in the same month', () => {
    expect(
      formatDayRange(midnight('2026-11-05'), midnight('2026-11-11'), MELBOURNE)
    ).toBe('6–12 November');
  });

  it('names both months when the span crosses into the next one', () => {
    expect(
      formatDayRange(midnight('2026-11-28'), midnight('2026-12-04'), MELBOURNE)
    ).toBe('29 November – 5 December');
  });

  it("uses the visitor's timezone, not the server's", () => {
    // 13:00 UTC on 5 Nov is still 5 Nov in UTC.
    expect(
      formatDayRange(midnight('2026-11-05'), midnight('2026-11-11'), 'UTC')
    ).toBe('5–11 November');
  });
});
