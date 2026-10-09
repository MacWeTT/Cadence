import { describe, expect, it } from 'vitest';
import { dayStatus, weekStatus } from './status';
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

  it('ignores ticks before start, in the future and after archive', () => {
    const odd = makeHabit({
      done: ['2026-09-30', '2026-10-12', '2026-10-07'],
      archivedOn: '2026-10-05',
    });
    expect(dayStatus(odd, '2026-09-30', ctx())).toBe('inactive');
    expect(dayStatus(odd, '2026-10-12', ctx())).toBe('inactive');
    expect(dayStatus(odd, '2026-10-07', ctx())).toBe('inactive');
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

  it('is inactive for weeks that end after archive and for weeks not yet started', () => {
    const archived = makeHabit({
      startDate: '2026-09-21',
      schedules: [weekly(3, '2026-09-21')],
      archivedOn: '2026-10-05',
    });
    expect(weekStatus(archived, '2026-10-05', ctx()).status).toBe('inactive');
    expect(weekStatus(h, '2026-10-12', ctx()).status).toBe('inactive');
  });

  it('is inactive for a daily habit, a habit with no schedule and a future start', () => {
    expect(weekStatus(makeHabit(), '2026-10-05', ctx()).status).toBe('inactive');
    expect(weekStatus(makeHabit({ schedules: [] }), '2026-10-05', ctx()).status).toBe('inactive');
    const future = makeHabit({ startDate: '2026-10-12', schedules: [weekly(3, '2026-10-12')] });
    expect(weekStatus(future, '2026-10-05', ctx()).status).toBe('inactive');
  });
});
