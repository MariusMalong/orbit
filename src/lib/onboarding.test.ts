import { describe, expect, it } from 'vitest';
import { parseStarterTasks } from './onboarding';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe('parseStarterTasks', () => {
  it('reads the filled-in rows and skips blank ones', () => {
    expect(
      parseStarterTasks(
        form({
          'task-0-title': '  Write the report ',
          'task-0-minutes': '90',
          'task-1-title': '',
          'task-1-minutes': '30',
          'task-2-title': 'Call the bank',
          'task-2-minutes': '15',
        })
      )
    ).toEqual({
      tasks: [
        { title: 'Write the report', durationEstimate: 90 },
        { title: 'Call the bank', durationEstimate: 15 },
      ],
    });
  });

  it('allows no tasks at all', () => {
    expect(parseStarterTasks(form({}))).toEqual({ tasks: [] });
  });

  it('rejects a task without a sensible estimate', () => {
    for (const minutes of ['', '0', '-5', '2.5', '2000', 'soon']) {
      expect(
        parseStarterTasks(
          form({ 'task-0-title': 'Plan', 'task-0-minutes': minutes })
        )
      ).toEqual({ error: '"Plan" needs a time estimate.' });
    }
  });
});
