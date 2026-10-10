import { describe, expect, it } from 'vitest';
import { isListedOn, weekProgress } from './listing';
import { ctx, makeHabit } from './test-helpers';
import type { Schedule } from './types';

const weekly = (timesPerWeek: number, effectiveFrom: string): Schedule => {
  return {
    kind: 'weekly_count',
    timesPerWeek,
    effectiveFrom,
  };
};

describe('isListedOn', () => {
  const h = makeHabit();

  it('lists a habit from its start date up to today', () => {
    expect(isListedOn(h, '2026-10-01', ctx())).toBe(true);
    expect(isListedOn(h, '2026-10-09', ctx())).toBe(true);
  });

  it('does not list days before the start or in the future', () => {
    expect(isListedOn(h, '2026-09-30', ctx())).toBe(false);
    expect(isListedOn(h, '2026-10-10', ctx())).toBe(false);
  });

  it('lists a habit that starts today on today but not the day before', () => {
    const fresh = makeHabit({ startDate: '2026-10-09' });

    expect(isListedOn(fresh, '2026-10-08', ctx())).toBe(false);
    expect(isListedOn(fresh, '2026-10-09', ctx())).toBe(true);
  });

  it('does not list a habit with no schedule', () => {
    expect(isListedOn(makeHabit({ schedules: [] }), '2026-10-05', ctx())).toBe(false);
  });

  it('does not list a habit that is archived right now', () => {
    expect(isListedOn(makeHabit({ pauses: [{ from: '2026-10-05', to: null }] }), '2026-10-02', ctx())).toBe(false);
  });

  it('lists a paused day only if it was ticked, and the days around the pause normally', () => {
    const paused = { pauses: [{ from: '2026-10-03', to: '2026-10-06' }] };

    expect(isListedOn(makeHabit(paused), '2026-10-04', ctx())).toBe(false);
    expect(isListedOn(makeHabit({ ...paused, done: ['2026-10-04'] }), '2026-10-04', ctx())).toBe(true);
    expect(isListedOn(makeHabit(paused), '2026-10-02', ctx())).toBe(true);
    expect(isListedOn(makeHabit(paused), '2026-10-06', ctx())).toBe(true);
  });

  it('lists a habit on both sides of a switch from daily to weekly', () => {
    const switched = makeHabit({
      schedules: [{ kind: 'daily', effectiveFrom: '2026-10-01' }, weekly(3, '2026-10-05')],
    });

    expect(isListedOn(switched, '2026-10-04', ctx())).toBe(true);
    expect(isListedOn(switched, '2026-10-06', ctx())).toBe(true);
  });
});

describe('weekProgress', () => {
  const base = { startDate: '2026-09-21', schedules: [weekly(3, '2026-09-21')] };

  it('is null for a daily habit', () => {
    expect(weekProgress(makeHabit(), '2026-10-07', ctx())).toBeNull();
  });

  it('counts ticks in the week and reports whether the goal is met', () => {
    const two = makeHabit({ ...base, done: ['2026-10-05', '2026-10-06'] });

    expect(weekProgress(two, '2026-10-07', ctx())).toEqual({ done: 2, target: 3, goalMet: false });
    const three = makeHabit({ ...base, done: ['2026-10-05', '2026-10-06', '2026-10-07'] });

    expect(weekProgress(three, '2026-10-07', ctx())).toEqual({ done: 3, target: 3, goalMet: true });
  });

  it('keeps counting bonus ticks above the target', () => {
    const four = makeHabit({ ...base, done: ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'] });

    expect(weekProgress(four, '2026-10-07', ctx())).toEqual({ done: 4, target: 3, goalMet: true });
  });

  it('does not count ticks after today', () => {
    const future = makeHabit({ ...base, done: ['2026-10-05', '2026-10-12'] });

    expect(weekProgress(future, '2026-10-07', ctx())?.done).toBe(1);
  });

  it('counts only from the start date in a partial first week', () => {
    const partial = makeHabit({
      startDate: '2026-10-07',
      schedules: [weekly(3, '2026-10-07')],
      done: ['2026-10-05', '2026-10-07'],
    });

    expect(weekProgress(partial, '2026-10-08', ctx())?.done).toBe(1);
  });

  it('follows the week start setting', () => {
    const h = makeHabit({ ...base, done: ['2026-10-04'] });

    expect(weekProgress(h, '2026-10-07', ctx('2026-10-09', 7))?.done).toBe(1);
    expect(weekProgress(h, '2026-10-07', ctx('2026-10-09', 1))?.done).toBe(0);
  });
});
