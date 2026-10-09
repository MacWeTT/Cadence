import { describe, expect, it } from 'vitest';
import { dayStatus, isPaused, weekStatus } from './status';
import { ctx, makeHabit } from './test-helpers';
import type { Schedule } from './types';

const weekly = (timesPerWeek: number, effectiveFrom: string): Schedule => ({
  kind: 'weekly_count',
  timesPerWeek,
  effectiveFrom,
});

describe('dayStatus (daily habits)', () => {
  const h = makeHabit({ done: ['2026-10-01', '2026-10-08', '2026-10-09'] });

  it('is done for ticked days and missed for past unticked days', () => {
    expect(dayStatus(h, '2026-10-01', ctx())).toBe('done');
    expect(dayStatus(h, '2026-10-02', ctx())).toBe('missed');
    expect(dayStatus(h, '2026-10-08', ctx())).toBe('done');
  });

  it('is pending for an unticked today', () => {
    expect(dayStatus(makeHabit({ done: ['2026-10-01'] }), '2026-10-09', ctx())).toBe('pending');
  });

  it('is inactive before start and in the future', () => {
    const only = makeHabit({ done: ['2026-10-01'] });
    expect(dayStatus(only, '2026-09-30', ctx())).toBe('inactive');
    expect(dayStatus(only, '2026-10-10', ctx())).toBe('inactive');
  });

  it('ignores ticks before start and in the future', () => {
    const odd = makeHabit({ done: ['2026-09-30', '2026-10-12'] });
    expect(dayStatus(odd, '2026-09-30', ctx())).toBe('inactive');
    expect(dayStatus(odd, '2026-10-12', ctx())).toBe('inactive');
  });

  it('is inactive on every day for a habit starting in the future', () => {
    expect(dayStatus(makeHabit({ startDate: '2026-10-12' }), '2026-10-09', ctx())).toBe('inactive');
  });

  it('is inactive for a habit with no schedule and for weekly habits', () => {
    expect(dayStatus(makeHabit({ schedules: [] }), '2026-10-05', ctx())).toBe('inactive');
    expect(dayStatus(makeHabit({ schedules: [weekly(3, '2026-10-01')] }), '2026-10-05', ctx())).toBe('inactive');
  });
});

describe('weekStatus (weekly habits)', () => {
  const h = makeHabit({
    startDate: '2026-09-21',
    schedules: [weekly(3, '2026-09-21')],
    done: ['2026-09-29', '2026-09-30', '2026-10-02', '2026-10-06'],
  });

  it('is met, in progress and missed as the weeks go by', () => {
    expect(weekStatus(h, '2026-09-28', ctx())).toEqual({ status: 'met', done: 3, target: 3 });
    expect(weekStatus(h, '2026-10-05', ctx())).toEqual({ status: 'in_progress', done: 1, target: 3 });
    expect(weekStatus(h, '2026-09-21', ctx())).toEqual({ status: 'missed', done: 0, target: 3 });
  });

  it('excludes a partial first week but still reports progress', () => {
    const mid = makeHabit({
      startDate: '2026-09-30',
      schedules: [weekly(3, '2026-09-30')],
      done: ['2026-09-30', '2026-10-01'],
    });
    expect(weekStatus(mid, '2026-09-28', ctx())).toEqual({ status: 'excluded', done: 2, target: 3 });
    const monday = makeHabit({ startDate: '2026-09-28', schedules: [weekly(3, '2026-09-28')] });
    expect(weekStatus(monday, '2026-09-28', ctx()).status).toBe('missed');
  });

  it('reports ticks above target as met with the real count', () => {
    const over = makeHabit({
      startDate: '2026-09-21',
      schedules: [weekly(3, '2026-09-21')],
      done: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'],
    });
    expect(weekStatus(over, '2026-09-28', ctx())).toEqual({ status: 'met', done: 4, target: 3 });
  });

  it('puts Saturday and Sunday in different weeks when weeks start on Sunday', () => {
    const base = { startDate: '2026-09-21', schedules: [weekly(2, '2026-09-21')], done: ['2026-10-03', '2026-10-04'] };
    expect(weekStatus(makeHabit(base), '2026-09-28', ctx('2026-10-09', 1))).toMatchObject({ status: 'met', done: 2 });
    expect(weekStatus(makeHabit(base), '2026-09-27', ctx('2026-10-09', 7))).toMatchObject({ status: 'missed', done: 1 });
    expect(weekStatus(makeHabit(base), '2026-10-04', ctx('2026-10-09', 7))).toMatchObject({ done: 1 });
  });

  it('is paused for a week that overlaps an open pause, and inactive for weeks not yet started', () => {
    const archived = makeHabit({
      startDate: '2026-09-21',
      schedules: [weekly(3, '2026-09-21')],
      pauses: [{ from: '2026-10-05', to: null }],
    });
    expect(weekStatus(archived, '2026-10-05', ctx()).status).toBe('paused');
    expect(weekStatus(h, '2026-10-12', ctx()).status).toBe('inactive');
  });

  it('excludes a week that straddles a type change, in both directions', () => {
    // Weeks start on Sunday, so the Monday switch lands mid-week.
    const toDaily = makeHabit({
      startDate: '2026-09-06',
      schedules: [weekly(3, '2026-09-06'), { kind: 'daily', effectiveFrom: '2026-09-28' }],
      done: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'],
    });
    expect(weekStatus(toDaily, '2026-09-27', ctx('2026-10-09', 7)).status).toBe('excluded');

    const toWeekly = makeHabit({
      startDate: '2026-09-06',
      schedules: [{ kind: 'daily', effectiveFrom: '2026-09-06' }, weekly(3, '2026-09-28')],
      done: ['2026-09-27', '2026-09-29', '2026-09-30', '2026-10-01'],
    });
    expect(weekStatus(toWeekly, '2026-09-27', ctx('2026-10-09', 7)).status).toBe('excluded');
  });

  it('is inactive for a daily habit, a habit with no schedule and a future start', () => {
    expect(weekStatus(makeHabit(), '2026-10-05', ctx()).status).toBe('inactive');
    expect(weekStatus(makeHabit({ schedules: [] }), '2026-10-05', ctx()).status).toBe('inactive');
    const future = makeHabit({ startDate: '2026-10-12', schedules: [weekly(3, '2026-10-12')] });
    expect(weekStatus(future, '2026-10-05', ctx()).status).toBe('inactive');
  });
});

describe('pauses', () => {
  const closed = makeHabit({
    done: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-07', '2026-10-08'],
    pauses: [{ from: '2026-10-05', to: '2026-10-07' }],
  });

  it('makes unticked paused days inactive (never missed) and resumes after the pause', () => {
    expect(dayStatus(closed, '2026-10-05', ctx())).toBe('inactive');
    expect(dayStatus(closed, '2026-10-06', ctx())).toBe('inactive');
    expect(dayStatus(closed, '2026-10-07', ctx())).toBe('done');
  });

  it('honours a tick on a paused day', () => {
    const ticked = makeHabit({ done: ['2026-10-05'], pauses: [{ from: '2026-10-05', to: '2026-10-07' }] });
    expect(dayStatus(ticked, '2026-10-05', ctx())).toBe('done');
  });

  it('treats the archive day as done when ticked and inactive after, with an open pause', () => {
    const open = makeHabit({ done: days5, pauses: [{ from: '2026-10-05', to: null }] });
    expect(dayStatus(open, '2026-10-05', ctx())).toBe('done');
    expect(dayStatus(open, '2026-10-06', ctx())).toBe('inactive');
  });

  it('ignores a zero-length pause (archive and restore on the same day)', () => {
    const zero = makeHabit({ done: days5.slice(0, 4), pauses: [{ from: '2026-10-09', to: '2026-10-09' }] });
    expect(dayStatus(zero, '2026-10-09', ctx())).toBe('pending');
    expect(isPaused(zero, '2026-10-09')).toBe(false);
  });

  it('marks a week that overlaps a pause as paused but still reports progress', () => {
    const h = makeHabit({
      startDate: '2026-09-21',
      schedules: [weekly(3, '2026-09-21')],
      done: ['2026-09-29', '2026-10-01'],
      pauses: [{ from: '2026-09-30', to: '2026-10-02' }],
    });
    expect(weekStatus(h, '2026-09-28', ctx())).toEqual({ status: 'paused', done: 2, target: 3 });
    expect(weekStatus(h, '2026-09-21', ctx()).status).toBe('missed');
  });
});

const days5 = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'];
