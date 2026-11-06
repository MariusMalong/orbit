import { describe, expect, it } from 'vitest';
import { clientIp, demoLimitReached, expiredDemoUsers } from './limits';

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

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name] ?? null,
});

describe('clientIp', () => {
  it('takes the first address the platform forwarded', () => {
    expect(
      clientIp(headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))
    ).toBe('203.0.113.7');
    expect(clientIp(headers({ 'x-real-ip': '2001:db8::1' }))).toBe(
      '2001:db8::1'
    );
  });

  it('returns null when unknown or from this machine', () => {
    expect(clientIp(headers({}))).toBeNull();
    expect(clientIp(headers({ 'x-forwarded-for': '127.0.0.1' }))).toBeNull();
    expect(clientIp(headers({ 'x-forwarded-for': '::1' }))).toBeNull();
    expect(
      clientIp(headers({ 'x-forwarded-for': '::ffff:127.0.0.1' }))
    ).toBeNull();
  });
});

describe('demoLimitReached', () => {
  it('allows demos under both limits', () => {
    expect(demoLimitReached({ fromVisitor: 9, total: 299 })).toBeNull();
  });

  it('stops one visitor starting too many', () => {
    expect(demoLimitReached({ fromVisitor: 10, total: 10 })).toBe('visitor');
  });

  it('stops everyone once the overall limit is reached', () => {
    expect(demoLimitReached({ fromVisitor: 0, total: 300 })).toBe('total');
    expect(demoLimitReached({ fromVisitor: null, total: 300 })).toBe('total');
  });

  it('only applies the overall limit when the visitor is unknown', () => {
    expect(demoLimitReached({ fromVisitor: null, total: 50 })).toBeNull();
  });
});
