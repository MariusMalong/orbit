import { describe, expect, it } from 'vitest';
import { lateReason } from './late';

const now = new Date('2026-11-09T12:00:00Z');

describe('lateReason', () => {
  it('says an overdue task was due, and is planned as soon as possible', () => {
    expect(lateReason(new Date('2026-11-09T09:00:00Z'), now, 'UTC')).toEqual({
      overdue: true,
      text: "was due 09:00. It's planned as soon as possible.",
    });
  });

  it('says a task due later will not make it', () => {
    const reason = lateReason(new Date('2026-11-11T10:00:00Z'), now, 'UTC');
    expect(reason.overdue).toBe(false);
    expect(reason.text).toMatch(
      /^won't be done by .*11 Nov, 10:00, even started as early as possible\.$/
    );
  });
});
