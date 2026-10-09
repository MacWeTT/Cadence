import { describe, expect, it } from 'vitest';
import { currentStreak, longestStreak } from './streaks';
import { ctx, makeHabit } from './test-helpers';
import type { Schedule } from './types';

const weekly = (timesPerWeek: number, effectiveFrom: string): Schedule => ({
  kind: 'weekly_count',
  timesPerWeek,
  effectiveFrom,
});
const days = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let d = new Date(from + 'T00:00:00Z'); d <= new Date(to + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

describe('currentStreak, daily', () => {
  it('counts consecutive done days; a pending today never breaks it', () => {
    expect(currentStreak(makeHabit({ done: days('2026-10-01', '2026-10-08') }), ctx())).toEqual({ unit: 'day', count: 8 });
    expect(currentStreak(makeHabit({ done: days('2026-10-01', '2026-10-09') }), ctx())).toEqual({ unit: 'day', count: 9 });
  });

  it('stops at a missed day', () => {
    const h = makeHabit({ done: [...days('2026-10-01', '2026-10-04'), ...days('2026-10-06', '2026-10-08')] });
    expect(currentStreak(h, ctx()).count).toBe(3);
  });

  it('is 0 when yesterday was missed, even though today is still pending', () => {
    expect(currentStreak(makeHabit({ done: days('2026-10-01', '2026-10-07') }), ctx()).count).toBe(0);
  });

  it('is 1 for a habit created and ticked on the same day', () => {
    expect(currentStreak(makeHabit({ startDate: '2026-10-09', done: ['2026-10-09'] }), ctx()).count).toBe(1);
  });

  it('is 0 for a habit that starts in the future or has no schedule', () => {
    expect(currentStreak(makeHabit({ startDate: '2026-10-12' }), ctx()).count).toBe(0);
    expect(currentStreak(makeHabit({ schedules: [] }), ctx()).count).toBe(0);
  });

  it('is 0 for an archived habit', () => {
    const h = makeHabit({ done: days('2026-10-01', '2026-10-04'), pauses: [{ from: '2026-10-05', to: null }] });
    expect(currentStreak(h, ctx()).count).toBe(0);
  });
});

describe('currentStreak, weekly', () => {
  const base = { startDate: '2026-09-28', schedules: [weekly(3, '2026-09-28')] };

  it('counts met weeks; a current week in progress never breaks it', () => {
    const h = makeHabit({ ...base, done: ['2026-09-29', '2026-09-30', '2026-10-02', '2026-10-06'] });
    expect(currentStreak(h, ctx())).toEqual({ unit: 'week', count: 1 });
  });

  it('adds the current week once it is met', () => {
    const h = makeHabit({
      ...base,
      done: ['2026-09-29', '2026-09-30', '2026-10-02', '2026-10-06', '2026-10-07', '2026-10-08'],
    });
    expect(currentStreak(h, ctx()).count).toBe(2);
  });

  it('is 0 when the previous week fell short', () => {
    const h = makeHabit({ ...base, done: ['2026-09-29', '2026-09-30', '2026-10-06'] });
    expect(currentStreak(h, ctx()).count).toBe(0);
  });

  it('does not count a met partial first week', () => {
    const mid = { startDate: '2026-09-30', schedules: [weekly(3, '2026-09-30')] };
    const first = ['2026-09-30', '2026-10-01', '2026-10-02'];
    expect(currentStreak(makeHabit({ ...mid, done: first }), ctx()).count).toBe(0);
    expect(currentStreak(makeHabit({ ...mid, done: [...first, '2026-10-06', '2026-10-07', '2026-10-08'] }), ctx()).count).toBe(1);
  });
});

describe('type switch', () => {
  const h = makeHabit({
    startDate: '2026-09-01',
    schedules: [{ kind: 'daily', effectiveFrom: '2026-09-01' }, weekly(3, '2026-10-05')],
    done: [...days('2026-09-01', '2026-10-03'), '2026-10-06', '2026-10-07', '2026-10-08'],
  });

  it('restarts the current streak in the new unit', () => {
    expect(currentStreak(h, ctx())).toEqual({ unit: 'week', count: 1 });
  });

  it('keeps the longest streak from before the switch', () => {
    expect(longestStreak(h, ctx())).toEqual({ unit: 'day', count: 33 });
  });
});

describe('longestStreak', () => {
  it('finds the longest run anywhere in the history', () => {
    const h = makeHabit({ done: [...days('2026-10-01', '2026-10-03'), ...days('2026-10-05', '2026-10-08')] });
    expect(longestStreak(h, ctx())).toEqual({ unit: 'day', count: 4 });
  });

  it('is unchanged by archiving', () => {
    const h = makeHabit({ done: days('2026-10-01', '2026-10-04'), pauses: [{ from: '2026-10-05', to: null }] });
    expect(longestStreak(h, ctx())).toEqual({ unit: 'day', count: 4 });
  });

  it('is 0 for a future start and 0 weeks for a weekly habit with no met week', () => {
    expect(longestStreak(makeHabit({ startDate: '2026-10-12' }), ctx()).count).toBe(0);
    const w = makeHabit({ startDate: '2026-09-28', schedules: [weekly(3, '2026-09-28')] });
    expect(longestStreak(w, ctx())).toEqual({ unit: 'week', count: 0 });
  });
});

describe('streaks and pauses', () => {
  it('skips paused days instead of breaking the streak', () => {
    const h = makeHabit({
      done: [...days('2026-10-01', '2026-10-04'), '2026-10-07', '2026-10-08'],
      pauses: [{ from: '2026-10-05', to: '2026-10-07' }],
    });
    expect(currentStreak(h, ctx())).toEqual({ unit: 'day', count: 6 });
  });

  it('is unaffected by an archive and restore on the same day', () => {
    const h = makeHabit({ done: days('2026-10-01', '2026-10-08'), pauses: [{ from: '2026-10-09', to: '2026-10-09' }] });
    expect(currentStreak(h, ctx()).count).toBe(8);
  });

  it('skips a paused week in a weekly streak', () => {
    const h = makeHabit({
      startDate: '2026-09-21',
      schedules: [weekly(3, '2026-09-21')],
      done: ['2026-09-21', '2026-09-22', '2026-09-23', '2026-10-05', '2026-10-06', '2026-10-07'],
      pauses: [{ from: '2026-09-30', to: '2026-10-02' }],
    });
    expect(currentStreak(h, ctx())).toEqual({ unit: 'week', count: 2 });
  });
});
