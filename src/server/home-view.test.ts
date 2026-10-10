import { describe, expect, it } from 'vitest';
import { ctx, makeHabit } from '@/domain/test-helpers';
import type { HabitData, Schedule } from '@/domain/types';
import type { HabitRow } from './habit-view';
import { buildHomeView } from './home-view';
import { buildTodayView } from './today-view';

const TODAY = '2026-10-09'; // a Friday: with Monday weeks, 3 days (Fri, Sat, Sun) are left
const row = (id: string): HabitRow => ({
  id,
  user_id: 'u',
  name: id,
  description: null,
  icon: '📖',
  color: 'moss',
  start_date: '2026-09-14',
  created_at: '2026-09-14T08:00:00Z',
  updated_at: '2026-09-14T08:00:00Z',
  archived_at: null,
});
const entry = (id: string, data: HabitData) => ({ habit: row(id), data });
const weekly = (timesPerWeek: number): Schedule => ({ kind: 'weekly_count', timesPerWeek, effectiveFrom: '2026-09-14' });
const daily = (done: string[]) => makeHabit({ startDate: '2026-09-14', done });
// A weekly habit with one met week behind it (a weekly streak of 1) and `thisWeek` ticks so far.
const weeklyWithStreak = (target: number, thisWeek: string[]) =>
  makeHabit({ startDate: '2026-09-14', schedules: [weekly(target)], done: ['2026-09-29', '2026-09-30', '2026-10-01', ...thisWeek] });

const home = (entries: ReturnType<typeof entry>[]) => buildHomeView(entries, ctx(TODAY));

describe('buildHomeView', () => {
  it('carries today\'s lists, strip and flags from the Today view', () => {
    const entries = [entry('a', daily(['2026-10-09'])), entry('b', daily([]))];
    expect(home(entries).view).toEqual(buildTodayView(entries, TODAY, ctx(TODAY)));
  });

  it('flags an unticked daily habit that has a streak', () => {
    const h = home([entry('read', daily(['2026-10-06', '2026-10-07', '2026-10-08']))]);
    expect(h.atRisk).toHaveLength(1);
    expect(h.atRisk[0]).toMatchObject({ id: 'read', streak: { unit: 'day', count: 3 }, needed: null, daysLeft: null });
    expect(h.continuing).toEqual([]);
  });

  it('moves a habit to "continuing" once it is ticked today', () => {
    const h = home([entry('read', daily(['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']))]);
    expect(h.atRisk).toEqual([]);
    expect(h.continuing).toEqual([{ name: 'read', count: 4 }]);
  });

  it('does not flag a daily habit without a streak', () => {
    expect(home([entry('read', daily(['2026-10-01']))]).atRisk).toEqual([]);
  });

  it('flags a weekly habit only when every remaining day is needed', () => {
    const needsAll = home([entry('run', weeklyWithStreak(3, []))]);
    expect(needsAll.atRisk).toHaveLength(1);
    expect(needsAll.atRisk[0]).toMatchObject({ id: 'run', streak: { unit: 'week', count: 1 }, needed: 3, daysLeft: 3 });

    expect(home([entry('run', weeklyWithStreak(3, ['2026-10-06']))]).atRisk).toEqual([]); // needs 2, has 3 days
    expect(home([entry('run', weeklyWithStreak(2, ['2026-10-06', '2026-10-07']))]).atRisk).toEqual([]); // goal met
  });

  it('does not flag a weekly habit with no streak', () => {
    const noStreak = makeHabit({ startDate: '2026-09-14', schedules: [weekly(3)], done: [] });
    expect(home([entry('run', noStreak)]).atRisk).toEqual([]);
  });

  it('ignores archived habits and habits that start tomorrow', () => {
    const archived = makeHabit({ startDate: '2026-09-14', done: ['2026-10-07', '2026-10-08'], pauses: [{ from: '2026-10-09', to: null }] });
    const future = makeHabit({ startDate: '2026-10-10' });
    const h = home([entry('old', archived), entry('new', future)]);
    expect(h.atRisk).toEqual([]);
    expect(h.continuing).toEqual([]);
  });

  it('puts the longest streak first', () => {
    const short = daily(['2026-10-07', '2026-10-08']);
    const long = daily(['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']);
    expect(home([entry('short', short), entry('long', long)]).atRisk.map((r) => r.id)).toEqual(['long', 'short']);
  });
});
