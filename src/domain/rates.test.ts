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

  it('stops counting at the archive date', () => {
    const archived = makeHabit({ archivedOn: '2026-10-05' });
    expect(completionRate(archived, '2026-10-01', '2026-10-09', ctx())).toEqual({ done: 0, expected: 5 });
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
