import { describe, expect, it } from 'vitest';
import {
  checkEventTimes,
  MAX_TASK_MINUTES,
  MAX_TITLE_LENGTH,
  parsePriority,
  parseTaskFields,
  parseTaskMinutes,
  parseTitle,
} from './validation';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

describe('parseTitle', () => {
  it('trims the title', () => {
    expect(parseTitle('  Call the bank ')).toEqual({ value: 'Call the bank' });
  });

  it('rejects a missing, blank or very long title', () => {
    expect(parseTitle(null)).toHaveProperty('error');
    expect(parseTitle('   ')).toHaveProperty('error');
    expect(parseTitle('x'.repeat(MAX_TITLE_LENGTH + 1))).toHaveProperty(
      'error'
    );
    expect(parseTitle('x'.repeat(MAX_TITLE_LENGTH))).toHaveProperty('value');
  });
});

describe('parseTaskMinutes', () => {
  it('accepts whole minutes from one up to the cap', () => {
    expect(parseTaskMinutes('1')).toEqual({ value: 1 });
    expect(parseTaskMinutes(String(MAX_TASK_MINUTES))).toEqual({
      value: MAX_TASK_MINUTES,
    });
  });

  it.each(['', 'abc', '0', '-30', '12.5', String(MAX_TASK_MINUTES + 1)])(
    'rejects %j',
    (value) => {
      expect(parseTaskMinutes(value)).toHaveProperty('error');
    }
  );
});

describe('parsePriority', () => {
  it('accepts low, medium and high only', () => {
    expect(parsePriority('3')).toEqual({ value: 3 });
    expect(parsePriority('0')).toHaveProperty('error');
    expect(parsePriority('9')).toHaveProperty('error');
    expect(parsePriority(null)).toHaveProperty('error');
  });
});

describe('checkEventTimes', () => {
  const at = (hours: number) => new Date(Date.UTC(2026, 10, 13, hours));

  it('accepts an event that ends after it starts', () => {
    expect(checkEventTimes(at(9), at(10))).toBeNull();
  });

  it('rejects an event that ends when or before it starts', () => {
    expect(checkEventTimes(at(10), at(10))).toHaveProperty('error');
    expect(checkEventTimes(at(10), at(9))).toHaveProperty('error');
  });

  it('rejects an event longer than a week', () => {
    expect(checkEventTimes(at(0), at(24 * 7 + 1))).toHaveProperty('error');
  });
});

describe('parseTaskFields', () => {
  it('returns the clean fields', () => {
    expect(
      parseTaskFields(
        form({ title: ' Report ', durationEstimate: '45', priority: '2' })
      )
    ).toEqual({
      value: { title: 'Report', durationEstimate: 45, priority: 2 },
    });
  });

  it('stops at the first problem', () => {
    expect(
      parseTaskFields(form({ title: 'Report', durationEstimate: 'NaN' }))
    ).toEqual({ error: 'The time estimate needs to be at least a minute.' });
  });
});
