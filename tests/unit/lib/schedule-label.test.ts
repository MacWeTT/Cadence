import { describe, expect, it } from 'vitest';
import { weekdayNames } from '@/lib/format';
import { scheduleMsg } from '@/lib/schedule-label';

describe('weekdayNames', () => {
  it('writes the short names, Monday being 1', () => {
    expect(weekdayNames([1, 3, 5])).toBe('Mon, Wed, Fri');
    expect(weekdayNames([6, 7])).toBe('Sat, Sun');
  });
});

describe('scheduleMsg', () => {
  const effectiveFrom = '2026-10-01';

  it('names every kind of schedule', () => {
    expect(scheduleMsg({ kind: 'daily', effectiveFrom })).toEqual({ key: 'labels.schedule.daily', values: undefined });
    expect(scheduleMsg({ kind: 'weekly_count', timesPerWeek: 3, effectiveFrom })).toEqual({
      key: 'labels.schedule.weekly',
      values: { times: 3 },
    });
    expect(scheduleMsg({ kind: 'weekdays', days: [1, 3, 5], effectiveFrom })).toEqual({
      key: 'labels.schedule.weekdays',
      values: { days: 'Mon, Wed, Fri' },
    });
    expect(scheduleMsg({ kind: 'optional', effectiveFrom })).toEqual({
      key: 'labels.schedule.optional',
      values: undefined,
    });
  });
});
