import { describe, expect, it } from 'vitest';
import { addRates, completionRate, ratio } from './rates';
import { ctx, makeHabit } from './test-helpers';
import type { Schedule } from './types';

const weekly = (timesPerWeek: number, effectiveFrom: string): Schedule => ({
  kind: 'weekly_count',
  timesPerWeek,
  effectiveFrom,
});

describe('completionRate, daily', () => {
  const h = makeHabit({ done: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06'] });

  it('counts closed days only: today is excluded, missed days stay in the denominator', () => {
    expect(completionRate(h, '2026-10-01', '2026-10-09', ctx())).toEqual({ done: 5, expected: 8 });
  });

  it('does not change when today is ticked', () => {
    const ticked = makeHabit({ done: [...h.completions, '2026-10-09'] });
    expect(completionRate(ticked, '2026-10-01', '2026-10-09', ctx())).toEqual({ done: 5, expected: 8 });
  });

  it('ignores the part of the window before the habit started', () => {
    expect(completionRate(h, '2026-09-20', '2026-10-09', ctx())).toEqual({ done: 5, expected: 8 });
  });

  it('stops counting once the habit is paused (archive day included)', () => {
    const archived = makeHabit({ pauses: [{ from: '2026-10-05', to: null }] });
    expect(completionRate(archived, '2026-10-01', '2026-10-09', ctx())).toEqual({ done: 0, expected: 4 });
  });

  it('is empty, with a null ratio, for a habit that starts in the future', () => {
    const r = completionRate(makeHabit({ startDate: '2026-10-12' }), '2026-10-01', '2026-10-09', ctx());
    expect(r).toEqual({ done: 0, expected: 0 });
    expect(ratio(r)).toBeNull();
  });
});

describe('completionRate, weekly', () => {
  const h = makeHabit({
    startDate: '2026-09-21',
    schedules: [weekly(3, '2026-09-21')],
    done: [
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', // 5 ticks, capped to 3
      '2026-09-29', '2026-10-01', // 2 ticks
      '2026-10-06', // current week, not counted
    ],
  });

  it('caps each week at its target and counts closed weeks only', () => {
    expect(completionRate(h, '2026-09-21', '2026-10-09', ctx())).toEqual({ done: 5, expected: 6 });
  });

  it('snaps the window to whole weeks', () => {
    expect(completionRate(h, '2026-09-23', '2026-10-09', ctx())).toEqual({ done: 2, expected: 3 });
  });

  it('leaves out the partial first week', () => {
    const mid = makeHabit({
      startDate: '2026-09-23',
      schedules: [weekly(3, '2026-09-23')],
      done: ['2026-09-23', '2026-09-24', '2026-09-29'],
    });
    expect(completionRate(mid, '2026-09-21', '2026-10-09', ctx())).toEqual({ done: 1, expected: 3 });
  });
});

describe('completionRate, week straddling a type change', () => {
  const c = ctx('2026-10-09', 7); // Sunday weeks, so the Monday switch lands mid-week

  it('does not count the same ticks as days and as a met week', () => {
    const toDaily = makeHabit({
      startDate: '2026-09-06',
      schedules: [weekly(3, '2026-09-06'), { kind: 'daily', effectiveFrom: '2026-09-28' }],
      done: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'],
    });
    expect(completionRate(toDaily, '2026-09-27', '2026-10-03', c)).toEqual({ done: 6, expected: 6 });
  });

  it('does not drop the days under the old daily schedule', () => {
    const toWeekly = makeHabit({
      startDate: '2026-09-06',
      schedules: [{ kind: 'daily', effectiveFrom: '2026-09-06' }, weekly(3, '2026-09-28')],
      done: ['2026-09-27', '2026-09-29', '2026-09-30', '2026-10-01'],
    });
    expect(completionRate(toWeekly, '2026-09-27', '2026-10-03', c)).toEqual({ done: 1, expected: 1 });
  });
});

describe('addRates / ratio', () => {
  it('adds numerators and denominators', () => {
    expect(addRates([{ done: 1, expected: 2 }, { done: 3, expected: 3 }])).toEqual({ done: 4, expected: 5 });
    expect(addRates([])).toEqual({ done: 0, expected: 0 });
  });

  it('is a fraction, or null when nothing was expected', () => {
    expect(ratio({ done: 4, expected: 5 })).toBe(0.8);
    expect(ratio({ done: 0, expected: 0 })).toBeNull();
  });
});

describe('completionRate and pauses', () => {
  it('leaves paused days out of the rate', () => {
    const h = makeHabit({
      done: ['2026-10-01', '2026-10-02', '2026-10-06', '2026-10-07'],
      pauses: [{ from: '2026-10-03', to: '2026-10-06' }],
    });
    expect(completionRate(h, '2026-10-01', '2026-10-09', ctx())).toEqual({ done: 4, expected: 5 });
  });

  it('leaves a paused week out of a weekly rate', () => {
    const h = makeHabit({
      startDate: '2026-09-21',
      schedules: [weekly(3, '2026-09-21')],
      done: ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-28', '2026-09-29', '2026-10-01'],
      pauses: [{ from: '2026-09-30', to: '2026-10-02' }],
    });
    expect(completionRate(h, '2026-09-21', '2026-10-09', ctx())).toEqual({ done: 3, expected: 3 });
  });
});
