import { describe, expect, it } from 'vitest';
import { completeWeek, parseWeeklyHoursForm } from './weekly-hours';

// A form for the whole week: 09:00–17:00 on weekdays, weekends off.
function weekForm(overrides: Record<string, string | null> = {}) {
  const form = new FormData();
  for (let day = 0; day < 7; day++) {
    form.set(`day-${day}-start`, '09:00');
    form.set(`day-${day}-end`, '17:00');
    if (day !== 0 && day !== 6) form.set(`day-${day}-on`, 'on');
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) form.delete(key);
    else form.set(key, value);
  }
  return form;
}

describe('completeWeek', () => {
  it('lists all seven days from Monday, with defaults for unsaved ones', () => {
    const week = completeWeek({
      5: { startTime: '10:00', endTime: '15:00' },
      0: { startTime: '09:00', endTime: '17:00', isDayOff: true },
    });

    expect(week.map((d) => d.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(week[0]).toEqual({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      isDayOff: false,
    });
    expect(week[4]).toMatchObject({ startTime: '10:00', endTime: '15:00' });
    expect(week[6].isDayOff).toBe(true);
  });
});

describe('parseWeeklyHoursForm', () => {
  it('reads each day, treating an unticked day as a day off', () => {
    const result = parseWeeklyHoursForm(weekForm());

    expect('rows' in result && result.rows).toHaveLength(7);
    if (!('rows' in result)) return;
    expect(result.rows.find((r) => r.dayOfWeek === 1)).toEqual({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      isDayOff: false,
    });
    expect(result.rows.find((r) => r.dayOfWeek === 6)?.isDayOff).toBe(true);
  });

  it('rejects a workday that ends before it starts', () => {
    expect(parseWeeklyHoursForm(weekForm({ 'day-3-end': '08:00' }))).toEqual({
      error: 'Wednesday has to end after it starts.',
    });
  });

  it('lets a day off keep any times', () => {
    const result = parseWeeklyHoursForm(weekForm({ 'day-0-end': '08:00' }));
    expect('rows' in result).toBe(true);
  });

  it('rejects missing or malformed times', () => {
    expect(parseWeeklyHoursForm(weekForm({ 'day-2-start': null }))).toEqual({
      error: 'Tuesday needs a start and end time.',
    });
    expect(parseWeeklyHoursForm(weekForm({ 'day-2-start': '25:00' }))).toEqual({
      error: 'Tuesday needs a start and end time.',
    });
  });

  it('needs at least one working day', () => {
    const allOff = weekForm(
      Object.fromEntries([1, 2, 3, 4, 5].map((d) => [`day-${d}-on`, null]))
    );
    expect(parseWeeklyHoursForm(allOff)).toEqual({
      error: 'Keep at least one working day, or nothing can be planned.',
    });
  });
});
