import { describe, it, expect } from 'vitest';
import { summarizeDay, DailySummaryInput } from './summarize';

const at = (hhmm: string) => new Date(`2026-11-05T${hhmm}:00`);

// An empty day; each test overrides only the fields it is about.
const emptyDay: DailySummaryInput = {
  focusEntries: [],
  completedTaskCount: 0,
  activeTaskCount: 0,
  scheduledBlocks: [],
};

describe('summarizeDay', () => {
  it('returns all zeros for an empty day', () => {
    expect(summarizeDay(emptyDay)).toEqual({
      focusedMinutes: 0,
      scheduledMinutes: 0,
      completedTasks: 0,
      plannedTasks: 0,
      completionRate: 0,
    });
  });

  it('adds up focused minutes across entries', () => {
    const summary = summarizeDay({
      ...emptyDay,
      focusEntries: [{ duration: 25 }, { duration: 50 }],
    });

    expect(summary.focusedMinutes).toBe(75);
  });

  it('counts an unfinished entry (null duration) as zero', () => {
    const summary = summarizeDay({
      ...emptyDay,
      focusEntries: [{ duration: 30 }, { duration: null }],
    });

    expect(summary.focusedMinutes).toBe(30);
  });

  it('adds up scheduled minutes from the engine blocks', () => {
    const summary = summarizeDay({
      ...emptyDay,
      scheduledBlocks: [
        { startTime: at('09:00'), endTime: at('10:30') },
        { startTime: at('13:00'), endTime: at('13:15') },
      ],
    });

    expect(summary.scheduledMinutes).toBe(105);
  });

  it('counts planned tasks as completed plus still active', () => {
    const summary = summarizeDay({
      ...emptyDay,
      completedTaskCount: 2,
      activeTaskCount: 3,
    });

    expect(summary.completedTasks).toBe(2);
    expect(summary.plannedTasks).toBe(5);
    expect(summary.completionRate).toBe(40);
  });

  it('rounds the completion rate to a whole percentage', () => {
    const summary = summarizeDay({
      ...emptyDay,
      completedTaskCount: 1,
      activeTaskCount: 2,
    });

    expect(summary.completionRate).toBe(33);
  });

  it('reports 100% when every task is done', () => {
    const summary = summarizeDay({
      ...emptyDay,
      completedTaskCount: 4,
      activeTaskCount: 0,
    });

    expect(summary.completionRate).toBe(100);
  });
});
