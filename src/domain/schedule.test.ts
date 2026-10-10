import { describe, expect, it } from 'vitest';
import { nextEditDate, parseScheduleInput, scheduleFor, scheduleOn } from './schedule';
import type { Schedule } from './types';
import { makeHabit } from './test-helpers';

const daily = (effectiveFrom: string): Schedule => {
  return { kind: 'daily', effectiveFrom };
};

const weekly = (timesPerWeek: number, effectiveFrom: string): Schedule => {
  return {
    kind: 'weekly_count',
    timesPerWeek,
    effectiveFrom,
  };
};

describe('scheduleOn', () => {
  const schedules = [daily('2026-09-01'), weekly(3, '2026-10-05')];

  it('uses the latest schedule effective on or before the date', () => {
    expect(scheduleOn(schedules, '2026-10-04')).toEqual(daily('2026-09-01'));
    expect(scheduleOn(schedules, '2026-10-05')).toEqual(weekly(3, '2026-10-05'));
  });

  it('is undefined before every schedule and for an empty list', () => {
    expect(scheduleOn(schedules, '2026-08-31')).toBeUndefined();
    expect(scheduleOn([], '2026-10-05')).toBeUndefined();
  });
});

describe('scheduleFor', () => {
  it('lets the earliest schedule cover days between startDate and its effectiveFrom', () => {
    const h = makeHabit({ startDate: '2026-09-01', schedules: [daily('2026-09-10')] });

    expect(scheduleFor(h, '2026-09-05')).toEqual(daily('2026-09-10'));
    expect(scheduleFor(h, '2026-08-31')).toBeUndefined();
  });

  it('is undefined when the habit has no schedule rows', () => {
    expect(scheduleFor(makeHabit({ schedules: [] }), '2026-10-05')).toBeUndefined();
  });
});

describe('parseScheduleInput', () => {
  it('accepts a valid weekly schedule and a valid daily one', () => {
    expect(parseScheduleInput({ kind: 'weekly_count', timesPerWeek: 3, effectiveFrom: '2026-10-05' })).toEqual({
      ok: true,
      value: weekly(3, '2026-10-05'),
    });
    expect(parseScheduleInput({ kind: 'daily', effectiveFrom: '2026-10-05' })).toEqual({
      ok: true,
      value: daily('2026-10-05'),
    });
  });

  it.each([
    ['timesPerWeek 0', { kind: 'weekly_count', timesPerWeek: 0, effectiveFrom: '2026-10-05' }],
    ['timesPerWeek 7', { kind: 'weekly_count', timesPerWeek: 7, effectiveFrom: '2026-10-05' }],
    ['timesPerWeek 3.5', { kind: 'weekly_count', timesPerWeek: 3.5, effectiveFrom: '2026-10-05' }],
    ['missing timesPerWeek', { kind: 'weekly_count', effectiveFrom: '2026-10-05' }],
    ['daily with timesPerWeek', { kind: 'daily', timesPerWeek: 3, effectiveFrom: '2026-10-05' }],
    ['unknown kind', { kind: 'fixed_days', effectiveFrom: '2026-10-05' }],
    ['malformed date', { kind: 'daily', effectiveFrom: '2026-13-40' }],
    ['not an object', 'daily'],
  ])('rejects %s', (_name, input) => {
    expect(parseScheduleInput(input).ok).toBe(false);
  });
});

describe('nextEditDate', () => {
  it('is the first day of next week', () => {
    expect(nextEditDate('2026-10-09', 1)).toBe('2026-10-12');
    expect(nextEditDate('2026-10-09', 7)).toBe('2026-10-11');
  });
});
