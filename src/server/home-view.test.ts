import { describe, expect, it } from 'vitest';
import { ctx, makeHabit } from '@/domain/test-helpers';
import type { HabitData, Schedule } from '@/domain/types';
import type { HabitRow } from './habit-view';
import { buildHomeView, continuingStreaks } from './home-view';
import { buildTodayView, type TodayRow } from './today-view';

const TODAY = '2026-10-09'; // a Friday: with Monday weeks, 3 days (Fri, Sat, Sun) are left

const row = (id: string): HabitRow => {
  return {
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
  };
};

const entry = (id: string, data: HabitData) => {
  return { habit: row(id), data };
};

const weekly = (timesPerWeek: number): Schedule => {
  return {
    kind: 'weekly_count',
    timesPerWeek,
    effectiveFrom: '2026-09-14',
  };
};

const daily = (done: string[]) => {
  return makeHabit({ startDate: '2026-09-14', done });
};

// A weekly habit with one met week behind it (a weekly streak of 1) and `thisWeek` ticks so far.
const weeklyWithStreak = (target: number, thisWeek: string[]) => {
  return makeHabit({
    startDate: '2026-09-14',
    schedules: [weekly(target)],
    done: ['2026-09-29', '2026-09-30', '2026-10-01', ...thisWeek],
  });
};

const home = (entries: ReturnType<typeof entry>[]) => {
  return buildHomeView(entries, ctx(TODAY));
};

describe('buildHomeView', () => {
  it("carries today's lists, strip and flags from the Today view", () => {
    const entries = [entry('a', daily(['2026-10-09'])), entry('b', daily([]))];

    expect(home(entries).view).toEqual(buildTodayView(entries, TODAY, ctx(TODAY)));
  });

  it('flags an unticked daily habit that has a streak', () => {
    const h = home([entry('read', daily(['2026-10-06', '2026-10-07', '2026-10-08']))]);

    expect(h.atRisk).toHaveLength(1);
    expect(h.atRisk[0]).toMatchObject({ id: 'read', streak: { unit: 'day', count: 3 }, needed: null, daysLeft: null });
  });

  it('does not flag a habit once it is ticked today', () => {
    expect(home([entry('read', daily(['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']))]).atRisk).toEqual([]);
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

  it('does not flag a weekly habit whose week can no longer be saved', () => {
    // Sunday: one day left, but 3 ticks needed. The streak is already lost, so a "last call" would mislead.
    const sunday = buildHomeView([entry('run', weeklyWithStreak(3, []))], ctx('2026-10-11'));

    expect(sunday.atRisk).toEqual([]);
    const saturday = buildHomeView([entry('run', weeklyWithStreak(2, []))], ctx('2026-10-10')); // 2 days left, 2 needed

    expect(saturday.atRisk).toHaveLength(1);
  });

  it('does not flag a weekly habit with no streak', () => {
    const noStreak = makeHabit({ startDate: '2026-09-14', schedules: [weekly(3)], done: [] });

    expect(home([entry('run', noStreak)]).atRisk).toEqual([]);
  });

  it('ignores archived habits and habits that start tomorrow', () => {
    const archived = makeHabit({
      startDate: '2026-09-14',
      done: ['2026-10-07', '2026-10-08'],
      pauses: [{ from: '2026-10-09', to: null }],
    });
    const future = makeHabit({ startDate: '2026-10-10' });
    const h = home([entry('old', archived), entry('new', future)]);

    expect(h.atRisk).toEqual([]);
  });

  it('puts the longest streak first', () => {
    const short = daily(['2026-10-07', '2026-10-08']);
    const long = daily(['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']);

    expect(
      home([entry('short', short), entry('long', long)]).atRisk.map(r => {
        return r.id;
      }),
    ).toEqual(['long', 'short']);
  });
});

describe('continuingStreaks', () => {
  const doneRow = (id: string, over: Partial<TodayRow> = {}): TodayRow => {
    return {
      id,
      name: id,
      icon: '📖',
      color: 'moss',
      ticked: true,
      streak: { unit: 'day', count: 4 },
      week: null,
      ...over,
    };
  };

  it('takes the streak as it stands for habits that were already done', () => {
    expect(
      continuingStreaks(
        [doneRow('a', { streak: { unit: 'day', count: 4 } }), doneRow('b', { streak: { unit: 'day', count: 9 } })],
        new Set(),
      ),
    ).toEqual([
      { name: 'b', count: 9 },
      { name: 'a', count: 4 },
    ]);
  });
  it('adds today for a habit ticked just now, before the server has counted it', () => {
    expect(continuingStreaks([doneRow('a', { streak: { unit: 'day', count: 4 } })], new Set(['a']))).toEqual([
      { name: 'a', count: 5 },
    ]);
    expect(continuingStreaks([doneRow('new', { streak: null })], new Set(['new']))).toEqual([
      { name: 'new', count: 1 },
    ]);
  });
  it('leaves out weekly habits and habits with no streak', () => {
    const weekly = doneRow('w', { week: { done: 3, target: 3, goalMet: true }, streak: { unit: 'week', count: 2 } });

    expect(continuingStreaks([weekly, doneRow('none', { streak: null })], new Set())).toEqual([]);
  });
});
