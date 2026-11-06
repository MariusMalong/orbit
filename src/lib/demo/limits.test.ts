import { describe, expect, it } from 'vitest';
import { expiredDemoUsers } from './limits';

describe('expiredDemoUsers', () => {
  it('matches only demo accounts created more than a day ago', () => {
    const now = new Date('2026-11-07T12:00:00Z');
    // Exactly these keys: an extra condition would quietly stop the cleanup.
    expect(expiredDemoUsers(now)).toEqual({
      isDemo: true,
      createdAt: { lt: new Date('2026-11-06T12:00:00Z') },
    });
  });
});
